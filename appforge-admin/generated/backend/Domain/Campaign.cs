#nullable enable

namespace Demo.TelegramOperations;

public sealed class Campaign
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string AudienceDescription { get; set; } = string.Empty;
    public string MessageTemplate { get; set; } = string.Empty;
    public Guid StatusId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Note { get; set; }
    public DateTime CreationTime { get; set; }
    public Guid? CreatorId { get; set; }
    public Guid? CreatorPositionId { get; set; }
    public DateTime? LastModificationTime { get; set; }
    public Guid? LastModifierId { get; set; }
    public Guid? LastModifierPositionId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletionTime { get; set; }
    public Guid? DeleterId { get; set; }
    public Guid? DeleterPositionId { get; set; }
    public string NameSearch { get; set; } = string.Empty;
    public string AudienceDescriptionSearch { get; set; } = string.Empty;
    public string MessageTemplateSearch { get; set; } = string.Empty;
    public string NoteSearch { get; set; } = string.Empty;
    public CampaignStatus Status { get; set; } = null!;
}
