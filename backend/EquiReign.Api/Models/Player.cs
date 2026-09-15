namespace EquiReign.Api.Models;

public enum AccountType { Anonymous, Registered }

public sealed class Player
{
    public Guid Id { get; init; }
    public AccountType AccountType { get; set; } = AccountType.Anonymous;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public PlayerProgress Progress { get; init; } = null!;
}

public sealed class PlayerProgress
{
    public Guid PlayerId { get; init; }
    public int CompletedCampaignLevel { get; set; }
    public Player Player { get; init; } = null!;
}

public sealed class PlayerCredential
{
    public Guid Id { get; init; }
    public Guid PlayerId { get; init; }
    public required byte[] TokenHash { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? RevokedAt { get; set; }
    public Player Player { get; init; } = null!;
}

public sealed record AnonymousAuthDto(Guid PlayerId, string AccessToken);
public sealed record CampaignAccessDto(string AccessToken, DateTimeOffset ExpiresAt);
