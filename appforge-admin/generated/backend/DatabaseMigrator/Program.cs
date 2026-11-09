#nullable enable

using Demo.BusinessOperations.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

const string PreviewDefaultConnectionArgument = "--appforge-preview-default-connection";

var builder = Host.CreateApplicationBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
    if (!args.Contains(PreviewDefaultConnectionArgument, StringComparer.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException("Database migrator requires ConnectionStrings:Default.");
    }

    using var previewDatabase = new BusinessOperationsAdminDbContextFactory().CreateDbContext(args);
    await previewDatabase.Database.MigrateAsync(CancellationToken.None);
    return;
}

builder.Services.AddDbContext<BusinessOperationsAdminDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

using var host = builder.Build();
using var scope = host.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<BusinessOperationsAdminDbContext>();
await db.Database.MigrateAsync(CancellationToken.None);
