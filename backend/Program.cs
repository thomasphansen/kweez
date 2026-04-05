using Kweez.Api.Data;
using Kweez.Api.Hubs;
using Kweez.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<KweezDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IScoringService, ScoringService>();
builder.Services.AddSingleton<IQuizNotificationService, QuizNotificationService>();

// SignalR
builder.Services.AddSignalR();

// CORS
var allowedOrigins = builder.Configuration.GetValue<string>("AllowedOrigins")?.Split(',') ?? ["http://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Controllers
builder.Services.AddControllers();

// Swagger for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KweezDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Serve uploaded files
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.MapControllers();
app.MapHub<QuizHub>("/hubs/quiz");

app.Run();
