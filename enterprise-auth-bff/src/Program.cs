using EnterpriseAuthBff;

var builder = WebApplication.CreateBuilder(args);
// Suppress framework request/remote-failure logs that could contain callback query tokens.
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.None);
builder.Logging.AddFilter("System.Net.Http.HttpClient", LogLevel.None);
var settings = BffSettings.Load(builder.Configuration);
BffApplication.AddServices(builder, settings);
var app = builder.Build();
app.Logger.LogWarning("EP-12 isolated BFF: keep demo Vite stopped and all backend ports loopback-only. Process-lifetime session keys; not production IAM.");
BffApplication.Configure(app, settings);
await app.RunAsync();
