ARG DOTNET_SDK_IMAGE=mcr.microsoft.com/dotnet/sdk:10.0
ARG DOTNET_RUNTIME_IMAGE=mcr.microsoft.com/dotnet/runtime:10.0

FROM ${DOTNET_SDK_IMAGE} AS build
ARG APPFORGE_MIGRATOR_PROJECT=backend/DatabaseMigrator/TelegramOperationsAdmin.Persistence.Migrator.csproj
WORKDIR /src
COPY . .
RUN dotnet publish "$APPFORGE_MIGRATOR_PROJECT" -c Release -o /out /p:UseAppHost=false

FROM ${DOTNET_RUNTIME_IMAGE} AS runtime
ARG APPFORGE_MIGRATOR_ASSEMBLY=TelegramOperationsAdmin.Persistence.Migrator.dll
ENV DOTNET_RUNNING_IN_CONTAINER=true \
    APPFORGE_MIGRATOR_ASSEMBLY=$APPFORGE_MIGRATOR_ASSEMBLY
WORKDIR /app
RUN groupadd --gid 64198 appforge \
    && useradd --uid 64198 --gid appforge --home-dir /app --shell /usr/sbin/nologin appforge
COPY --from=build /out ./
RUN chown -R appforge:appforge /app
USER appforge
ENTRYPOINT ["sh", "-c", "exec dotnet \"$APPFORGE_MIGRATOR_ASSEMBLY\""]
