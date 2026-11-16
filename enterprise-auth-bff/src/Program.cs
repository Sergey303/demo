using EnterpriseAuthBff;
using Microsoft.AspNetCore.DataProtection;

var builder = WebApplication.CreateBuilder(args);
// Suppress framework request/remote-failure logs that could contain callback query tokens.
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.None);
builder.Logging.AddFilter("System.Net.Http.HttpClient", LogLevel.None);
builder.Logging.AddFilter("Microsoft.AspNetCore.DataProtection", LogLevel.None);
builder.Logging.AddFilter("Npgsql", LogLevel.None);
WebApplication app;
BffSettings settings;
try
{
    settings = BffSettings.Load(builder.Configuration);
    BffApplication.AddServices(builder, settings);
    app = builder.Build();
    app.Services.GetRequiredService<BffInfrastructure>().Probe(app.Services.GetRequiredService<IDataProtectionProvider>());
    // Read-only schema/readiness probe. Operators apply migrations separately.
    await app.Services.GetRequiredService<PostgresSessionRegistry>().CheckSchema(CancellationToken.None);
}
catch (Exception)
{
    Console.Error.WriteLine("EP-12 BFF startup failed: invalid or unavailable secure infrastructure.");
    Environment.ExitCode = 1;
    return;
}
app.Logger.LogWarning("EP-12 isolated BFF: keep demo Vite stopped and backend ports loopback-only. Not production IAM.");
try
{
    BffApplication.Configure(app, settings);
    await app.RunAsync();
}
catch (Exception)
{
    Console.Error.WriteLine("EP-12 BFF host unavailable.");
    Environment.ExitCode = 1;
}
finally { await app.DisposeAsync(); }
