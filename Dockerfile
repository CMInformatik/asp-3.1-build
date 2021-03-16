FROM mcr.microsoft.com/dotnet/sdk:3.1 AS publish
# Adjust default appName here
ENV appName=CMI.AppName

WORKDIR /src
ENV projectfile=$appName/$appName.csproj
ENV testprojectfile=$appName.Tests/$appName.Tests.csproj
COPY "./src/$projectfile" "./$projectfile"
COPY "./src/$testprojectfile" "./$testprojectfile"

#Allow secret injection for authenticated nuget feeds.
RUN --mount=type=secret,id=nuget_config \
                                        # Copy for RW Access, secrets are RO where mounted
                                        cp /run/secrets/nuget_config ./nuget.config &&\
                                        # Disable default VS/Windows Source
                                        dotnet nuget disable source "Microsoft Visual Studio Offline Packages" || true &&\
                                        # Actually Restore
                                        dotnet restore  "./$projectfile" &&\
                                        # and remove our copy so it doesn't get stored in a layer
                                        rm nuget.config

RUN --mount=type=secret,id=nuget_config \
                                        cp /run/secrets/nuget_config ./nuget.config &&\
                                        dotnet nuget disable source "Microsoft Visual Studio Offline Packages" || true &&\
                                        dotnet restore  "./$testprojectfile" &&\
                                        rm nuget.config

COPY ./src .
RUN dotnet build "./$projectfile" --no-restore
RUN dotnet build "./$testprojectfile" --no-restore

RUN dotnet test "./$testprojectfile" --no-restore
RUN dotnet publish "./$projectfile" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:3.1 AS final
# Adjust default appName here
ENV appName=CMI.AppName
RUN adduser --disabled-password \
  --home /app \
  --gecos '' dotnetuser && chown -R dotnetuser /app

USER dotnetuser
WORKDIR /app
EXPOSE 5000
COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "./${appName:-AppName}.dll", "--urls", "http://+:5000"]