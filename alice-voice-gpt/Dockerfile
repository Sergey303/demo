FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY AliceVoiceGpt.csproj ./
RUN dotnet restore AliceVoiceGpt.csproj
COPY Program.cs CodexAnswerer.cs ./
RUN dotnet publish AliceVoiceGpt.csproj -c Release --no-restore -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
RUN apk add --no-cache nodejs npm \
    && npm install --global --no-audit --no-fund @openai/codex@0.166.0 \
    && npm cache clean --force
WORKDIR /app
COPY --from=build /out ./
RUN mkdir -p /app/voice-workdir /home/app/.codex \
    && chown -R $APP_UID:0 /app/voice-workdir /home/app/.codex
ENV CODEX_HOME=/home/app/.codex \
    HOME=/home/app \
    XDG_CACHE_HOME=/tmp \
    TMPDIR=/tmp
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "AliceVoiceGpt.dll"]
