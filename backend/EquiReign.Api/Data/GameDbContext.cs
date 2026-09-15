using EquiReign.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EquiReign.Api.Data;

public sealed class GameDbContext(DbContextOptions<GameDbContext> options) : DbContext(options)
{
    public DbSet<Puzzle> Puzzles => Set<Puzzle>();
    public DbSet<CampaignLevel> CampaignLevels => Set<CampaignLevel>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<PlayerProgress> PlayerProgress => Set<PlayerProgress>();
    public DbSet<PlayerCredential> PlayerCredentials => Set<PlayerCredential>();

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
            entity.Property(x => x.GivenQueenCellIndexes).HasColumnType("integer[]");
            entity.Property(x => x.SolutionColumns).HasColumnType("smallint[]");
        });
        modelBuilder.Entity<CampaignLevel>(entity =>
        {
            entity.HasKey(x => x.Level);
            entity.HasIndex(x => x.PuzzleId);
            entity.HasOne(x => x.Puzzle).WithMany().HasForeignKey(x => x.PuzzleId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<Player>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AccountType).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(x => x.Progress).WithOne(x => x.Player).HasForeignKey<PlayerProgress>(x => x.PlayerId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<PlayerProgress>(entity => entity.HasKey(x => x.PlayerId));
        modelBuilder.Entity<PlayerCredential>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.Property(x => x.TokenHash).HasColumnType("bytea");
            entity.HasOne(x => x.Player).WithMany().HasForeignKey(x => x.PlayerId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
