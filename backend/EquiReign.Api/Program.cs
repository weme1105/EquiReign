using EquiReign.Api.Data;
using EquiReign.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddDbContext<GameDbContext>(options => options.UseNpgsql(builder.Configuration.GetConnectionString("GameDatabase")));
var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/puzzles/{publicId}", async (string publicId, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.PublicId == publicId && x.Status == PuzzleStatus.Published)
    .Select(PuzzleDto.Projection).SingleOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());
app.MapGet("/api/campaign/{level:int}", async (int level, GameDbContext db, CancellationToken ct) =>
{
    if (level < 1) return Results.BadRequest();
    var puzzle = await db.CampaignLevels.AsNoTracking().Where(x => x.Level == level)
        .Select(x => new CampaignPuzzleDto(x.Level, x.Puzzle.PublicId, x.Puzzle.BoardSize, x.Puzzle.Difficulty, x.Puzzle.RegionMap, x.Puzzle.Version))
        .SingleOrDefaultAsync(ct);
    return puzzle is null ? Results.NotFound() : Results.Ok(puzzle);
});
app.MapGet("/api/challenges/random", async (string difficulty, short size, GameDbContext db, CancellationToken ct) =>
  await db.Puzzles.AsNoTracking().Where(x => x.Difficulty == difficulty && x.BoardSize == size && !x.IsInfinite && x.Status == PuzzleStatus.Published)
    .OrderBy(_ => Guid.NewGuid()).Select(PuzzleDto.Projection).FirstOrDefaultAsync(ct) is { } puzzle ? Results.Ok(puzzle) : Results.NotFound());

app.Run();

public partial class Program;
