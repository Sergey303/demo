using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.BusinessOperations.Persistence.Configurations;

public sealed class WorkItemConfiguration : IEntityTypeConfiguration<WorkItem>
{
    public void Configure(EntityTypeBuilder<WorkItem> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("WorkItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.ServiceRequestId).IsRequired();
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(200);
        builder.Property(x => x.Assignee).HasMaxLength(120);
        builder.Property(x => x.Status).HasMaxLength(36);
        builder.Property(x => x.Note).HasMaxLength(700);
        builder.ToTable("WorkItems", table => table.HasCheckConstraint("CK_WorkItems_Title_Standard", "LENGTH(\"Title\") <= 200"));
        builder.ToTable("WorkItems", table => table.HasCheckConstraint("CK_WorkItems_Assignee_Standard", "\"Assignee\" IS NULL OR (LENGTH(\"Assignee\") <= 120)"));
        builder.ToTable("WorkItems", table => table.HasCheckConstraint("CK_WorkItems_Status_Standard", "\"Status\" IS NULL OR (LENGTH(\"Status\") <= 36)"));
        builder.ToTable("WorkItems", table => table.HasCheckConstraint("CK_WorkItems_Note_Standard", "\"Note\" IS NULL OR (LENGTH(\"Note\") <= 700)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_WorkItems_IsDeleted");
        builder.Property(x => x.TitleSearch).IsRequired();
        builder.Property(x => x.TitleSearch).HasMaxLength(200);
        builder.Property(x => x.AssigneeSearch).IsRequired();
        builder.Property(x => x.AssigneeSearch).HasMaxLength(120);
        builder.Property(x => x.StatusSearch).IsRequired();
        builder.Property(x => x.StatusSearch).HasMaxLength(36);
        builder.Property(x => x.NoteSearch).IsRequired();
        builder.Property(x => x.NoteSearch).HasMaxLength(700);
        builder.HasOne(x => x.ServiceRequest)
            .WithMany(x => x.WorkItems)
            .HasForeignKey(x => x.ServiceRequestId)
            .IsRequired();
        builder.HasIndex(x => x.ServiceRequestId)
            .HasDatabaseName("IX_WorkItems_ServiceRequestId");
        builder.HasIndex(x => x.TitleSearch)
            .HasDatabaseName("IX_WorkItems_TitleSearch");
        builder.HasIndex(x => x.AssigneeSearch)
            .HasDatabaseName("IX_WorkItems_AssigneeSearch");
        builder.HasIndex(x => x.StatusSearch)
            .HasDatabaseName("IX_WorkItems_StatusSearch");
        builder.HasIndex(x => x.NoteSearch)
            .HasDatabaseName("IX_WorkItems_NoteSearch");
    }
}
