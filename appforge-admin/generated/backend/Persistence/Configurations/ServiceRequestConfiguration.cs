using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.BusinessOperations.Persistence.Configurations;

public sealed class ServiceRequestConfiguration : IEntityTypeConfiguration<ServiceRequest>
{
    public void Configure(EntityTypeBuilder<ServiceRequest> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("ServiceRequests");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.CustomerId).IsRequired();
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(200);
        builder.Property(x => x.Priority).HasMaxLength(24);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.ToTable("ServiceRequests", table => table.HasCheckConstraint("CK_ServiceRequests_Title_Standard", "LENGTH(\"Title\") <= 200"));
        builder.ToTable("ServiceRequests", table => table.HasCheckConstraint("CK_ServiceRequests_Priority_Standard", "\"Priority\" IS NULL OR (LENGTH(\"Priority\") <= 24)"));
        builder.ToTable("ServiceRequests", table => table.HasCheckConstraint("CK_ServiceRequests_Description_Standard", "\"Description\" IS NULL OR (LENGTH(\"Description\") <= 1000)"));
        builder.Property(x => x.CreationTime).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.HasQueryFilter(x => !x.IsDeleted);
        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_ServiceRequests_IsDeleted");
        builder.Property(x => x.TitleSearch).IsRequired();
        builder.Property(x => x.TitleSearch).HasMaxLength(200);
        builder.Property(x => x.PrioritySearch).IsRequired();
        builder.Property(x => x.PrioritySearch).HasMaxLength(24);
        builder.Property(x => x.DescriptionSearch).IsRequired();
        builder.Property(x => x.DescriptionSearch).HasMaxLength(1000);
        builder.HasOne(x => x.Customer)
            .WithMany(x => x.ServiceRequests)
            .HasForeignKey(x => x.CustomerId)
            .IsRequired();
        builder.HasIndex(x => x.CustomerId)
            .HasDatabaseName("IX_ServiceRequests_CustomerId");
        builder.HasIndex(x => x.TitleSearch)
            .HasDatabaseName("IX_ServiceRequests_TitleSearch");
        builder.HasIndex(x => x.PrioritySearch)
            .HasDatabaseName("IX_ServiceRequests_PrioritySearch");
        builder.HasIndex(x => x.DescriptionSearch)
            .HasDatabaseName("IX_ServiceRequests_DescriptionSearch");
    }
}
