using System.Linq.Expressions;

namespace EquiReign.Api.Models;

public sealed record PuzzleDto(string PuzzleId, short Size, string Difficulty, int[] RegionMap, int[] GivenQueenCellIndexes, int Version)
{
    public static readonly Expression<Func<Puzzle, PuzzleDto>> Projection = puzzle =>
        new(puzzle.PublicId, puzzle.BoardSize, puzzle.Difficulty, puzzle.RegionMap, puzzle.GivenQueenCellIndexes, puzzle.Version);
}

public sealed record CampaignPuzzleDto(int Level, string PuzzleId, short Size, string Difficulty, int[] RegionMap, int[] GivenQueenCellIndexes, int Version);

public sealed record CompleteCampaignPuzzleRequest(string PuzzleId, int PuzzleVersion, int[] QueenCellIndexes);
