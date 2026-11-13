FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY AliceVoiceGpt.csproj ./
RUN dotnet restore AliceVoiceGpt.csproj
COPY Program.cs ./
RUN dotnet publish AliceVoiceGpt.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app
COPY --from=build /out ./
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "AliceVoiceGpt.dll"]
