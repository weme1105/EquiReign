using System.Security.Cryptography;
using EquiReign.Api.Data;
using EquiReign.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
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

app.MapGet("/api/campaign/batches/{startLevel:int}", async (int startLevel, GameDbContext db, CancellationToken ct) =>
{
    if (startLevel < 1 || startLevel % 100 != 0) return Results.BadRequest(new { error = "batch_start_must_be_positive_multiple_of_100" });
    var endLevel = startLevel + 99;
    var puzzles = await db.CampaignLevels.AsNoTracking()
        .Where(x => x.Level >= startLevel && x.Level <= endLevel && x.Puzzle.Status == PuzzleStatus.Published)
        .OrderBy(x => x.Level)
        .Select(x => new CampaignPuzzleDto(x.Level, x.Puzzle.PublicId, x.Puzzle.BoardSize, x.Puzzle.Difficulty, x.Puzzle.RegionMap, x.Puzzle.GivenQueenCellIndexes, x.Puzzle.Version))
        .ToListAsync(ct);
    return Results.Ok(new CampaignPuzzleBatchDto(startLevel, endLevel, puzzles));
});

app.MapGet("/api/puzzles/{publicId}", async (string publicId, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.PublicId == publicId && x.Status == PuzzleStatus.Published).Select(PuzzleDto.Projection).SingleOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());

app.MapGet("/api/challenges/random", async (string difficulty, short size, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.Difficulty == difficulty && x.BoardSize == size && !x.IsInfinite && x.Status == PuzzleStatus.Published)
    .OrderBy(_ => Guid.NewGuid()).Select(PuzzleDto.Projection).FirstOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());

app.Run();

static string CreateOpaqueToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

public partial class Program;
