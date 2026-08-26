using System.Security.Cryptography;
using EquiReign.Api.Data;
using EquiReign.Api.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddDataProtection();
builder.Services.AddDbContext<GameDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("GameDatabase")));
var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/api/auth/anonymous", async (GameDbContext db, CancellationToken ct) =>
{
    var player = new Player { Id = Guid.NewGuid(), AccountType = AccountType.Anonymous };
    var progress = new PlayerProgress { PlayerId = player.Id, CompletedCampaignLevel = 0, Player = player };
    var rawToken = CreateOpaqueToken();
    var credential = new PlayerCredential { Id = Guid.NewGuid(), PlayerId = player.Id, TokenHash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)), Player = player };
    db.Players.Add(player); db.PlayerProgress.Add(progress); db.PlayerCredentials.Add(credential);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new AnonymousAuthDto(player.Id, rawToken));
});

app.MapPost("/api/campaign/{level:int}/access", async (int level, HttpRequest request, GameDbContext db, IDataProtectionProvider protection, CancellationToken ct) =>
{
    if (level < 1) return Results.BadRequest();
    var player = await ResolvePlayerAsync(request, db, ct); if (player is null) return Results.Unauthorized();
    var completed = await db.PlayerProgress.AsNoTracking().Where(x => x.PlayerId == player.Id).Select(x => x.CompletedCampaignLevel).SingleAsync(ct);
    if (level > completed + 1) return Results.Forbid();
    var expiresAt = DateTimeOffset.UtcNow.AddMinutes(10);
    var accessToken = protection.CreateProtector("EquiReign.CampaignAccess.v1").Protect($"{player.Id:N}|{level}|{expiresAt.ToUnixTimeSeconds()}");
    return Results.Ok(new CampaignAccessDto(accessToken, expiresAt));
});

app.MapGet("/api/campaign/access/{accessToken}", async (string accessToken, HttpRequest request, GameDbContext db, IDataProtectionProvider protection, CancellationToken ct) =>
{
    var player = await ResolvePlayerAsync(request, db, ct); if (player is null) return Results.Unauthorized();
    string payload; try { payload = protection.CreateProtector("EquiReign.CampaignAccess.v1").Unprotect(accessToken); } catch { return Results.Unauthorized(); }
    var parts = payload.Split('|');
    if (parts.Length != 3 || !Guid.TryParseExact(parts[0], "N", out var playerId) || !int.TryParse(parts[1], out var level) || !long.TryParse(parts[2], out var expiry)) return Results.Unauthorized();
    if (playerId != player.Id || DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiry) return Results.Forbid();
    var completed = await db.PlayerProgress.AsNoTracking().Where(x => x.PlayerId == player.Id).Select(x => x.CompletedCampaignLevel).SingleAsync(ct);
    if (level < 1 || level > completed + 1) return Results.Forbid();
    var puzzle = await db.CampaignLevels.AsNoTracking().Where(x => x.Level == level && x.Puzzle.Status == PuzzleStatus.Published)
        .Select(x => new CampaignPuzzleDto(x.Level, x.Puzzle.PublicId, x.Puzzle.BoardSize, x.Puzzle.Difficulty, x.Puzzle.RegionMap, x.Puzzle.GivenQueenCellIndexes, x.Puzzle.Version)).SingleOrDefaultAsync(ct);
    return puzzle is null ? Results.NotFound() : Results.Ok(puzzle);
});

app.MapPost("/api/campaign/{level:int}/complete", async (int level, CompleteCampaignPuzzleRequest completion, HttpRequest request, GameDbContext db, CancellationToken ct) =>
{
    if (level < 1) return Results.BadRequest();
    var player = await ResolvePlayerAsync(request, db, ct); if (player is null) return Results.Unauthorized();
    var progress = await db.PlayerProgress.SingleAsync(x => x.PlayerId == player.Id, ct);
    if (level > progress.CompletedCampaignLevel + 1) return Results.Forbid();
    var puzzle = await db.CampaignLevels.AsNoTracking().Where(x => x.Level == level && x.Puzzle.Status == PuzzleStatus.Published).Select(x => x.Puzzle).SingleOrDefaultAsync(ct);
    if (puzzle is null) return Results.NotFound();
    if (!string.Equals(completion.PuzzleId, puzzle.PublicId, StringComparison.Ordinal) || completion.PuzzleVersion != puzzle.Version) return Results.Conflict(new { error = "puzzle_version_mismatch" });
    if (!IsValidCompletion(puzzle, completion.QueenCellIndexes)) return Results.BadRequest(new { error = "invalid_solution" });
    if (level == progress.CompletedCampaignLevel + 1) { progress.CompletedCampaignLevel = level; await db.SaveChangesAsync(ct); }
    return Results.Ok(new { progress.CompletedCampaignLevel });
});

app.MapGet("/api/puzzles/{publicId}", async (string publicId, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.PublicId == publicId && x.Status == PuzzleStatus.Published).Select(PuzzleDto.Projection).SingleOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());
app.MapGet("/api/challenges/random", async (string difficulty, short size, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.Difficulty == difficulty && x.BoardSize == size && !x.IsInfinite && x.Status == PuzzleStatus.Published).OrderBy(_ => Guid.NewGuid()).Select(PuzzleDto.Projection).FirstOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());
app.Run();

static bool IsValidCompletion(Puzzle puzzle, int[] cells)
{
    var size = puzzle.BoardSize;
    if (size <= 0 || puzzle.RegionMap.Length != size * size || cells.Length != size || cells.Distinct().Count() != size) return false;
    if (cells.Any(cell => cell < 0 || cell >= size * size)) return false;
    if (puzzle.GivenQueenCellIndexes.Any(given => !cells.Contains(given))) return false;
    var rows = new HashSet<int>(); var columns = new HashSet<int>(); var regions = new HashSet<int>();
    foreach (var cell in cells)
    {
        var row = cell / size; var column = cell % size; var region = puzzle.RegionMap[cell];
        if (!rows.Add(row) || !columns.Add(column) || !regions.Add(region)) return false;
    }
    for (var i = 0; i < cells.Length; i++)
    for (var j = i + 1; j < cells.Length; j++)
    {
        var rowDistance = Math.Abs(cells[i] / size - cells[j] / size);
        var columnDistance = Math.Abs(cells[i] % size - cells[j] % size);
        if (rowDistance <= 1 && columnDistance <= 1) return false;
    }
    return true;
}

static string CreateOpaqueToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
static async Task<Player?> ResolvePlayerAsync(HttpRequest request, GameDbContext db, CancellationToken ct)
{
    var authorization = request.Headers.Authorization.ToString(); if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
    var token = authorization[7..].Trim(); if (token.Length == 0) return null;
    var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
    return await db.PlayerCredentials.AsNoTracking().Where(x => x.RevokedAt == null && x.TokenHash == hash).Select(x => x.Player).SingleOrDefaultAsync(ct);
}

public partial class Program;
