using Demo.BusinessOperations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Demo.BusinessOperations.Persistence.Configurations;

public sealed class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);
        builder.ToTable("Roles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).IsRequired();
        builder.Property(x => x.Code).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(128);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200);
        builder.ToTable("Roles", table => table.HasCheckConstraint("CK_Roles_Code_Standard", "LENGTH(\"Code\") <= 128"));
        builder.ToTable("Roles", table => table.HasCheckConstraint("CK_Roles_Name_Standard", "LENGTH(\"Name\") <= 200"));
        builder.HasIndex(x => x.Code)
            .HasDatabaseName("IX_Roles_Code")
            .IsUnique();
    }
}
