namespace EquiReign.Api.Models;

public enum PuzzleStatus { Draft, Published, Retired }

public sealed class Puzzle
{
    public Guid Id { get; init; }
    public required string PublicId { get; init; }
    public short BoardSize { get; init; }
    public required string Difficulty { get; init; }
    public int PoolOrdinal { get; init; }
    public required int[] RegionMap { get; init; }
    public int[] GivenQueenCellIndexes { get; init; } = [];
    public required short[] SolutionColumns { get; init; }
    public long NodesVisited { get; init; }
    public long BranchesTried { get; init; }
    public long Backtracks { get; init; }
    public decimal CostScore { get; init; }
    public bool IsInfinite { get; init; }
    public int Version { get; init; } = 1;
    public PuzzleStatus Status { get; init; } = PuzzleStatus.Draft;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
}

public sealed class CampaignLevel
{
    public int Level { get; init; }
    public Guid PuzzleId { get; init; }
    public required Puzzle Puzzle { get; init; }
}
