using EquiReign.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EquiReign.Api.Data;

public sealed class GameDbContext(DbContextOptions<GameDbContext> options) : DbContext(options)
{
    public DbSet<Puzzle> Puzzles => Set<Puzzle>();
    public DbSet<CampaignLevel> CampaignLevels => Set<CampaignLevel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Puzzle>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.PublicId).IsUnique();
            entity.HasIndex(x => new { x.Difficulty, x.BoardSize, x.PoolOrdinal }).IsUnique();
            entity.Property(x => x.PublicId).HasMaxLength(80);
            entity.Property(x => x.Difficulty).HasMaxLength(20);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.RegionMap).HasColumnType("integer[]");
            entity.Property(x => x.SolutionColumns).HasColumnType("smallint[]");
        });
        modelBuilder.Entity<CampaignLevel>(entity =>
        {
            entity.HasKey(x => x.Level);
            entity.HasIndex(x => x.PuzzleId);
            entity.HasOne(x => x.Puzzle).WithMany().HasForeignKey(x => x.PuzzleId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
