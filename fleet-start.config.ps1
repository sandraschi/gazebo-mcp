# Per-repo fleet start config for gazebo-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'gazebo-mcp'
    BackendPort  = 10991
    FrontendPort = 10990
    HealthPath   = '/health'
    WebRoot      = 'web_sota'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'server:app'
        WorkDir       = 'web_sota/backend'
        PythonPath    = 'web_sota/backend;.'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '10991' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
