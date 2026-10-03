#Requires -Version 5.1
<#
.SYNOPSIS
Shim: route the fleet `just mcpb-pack` recipe to the standard pack script.

The canonical pipeline moved to mcpb/pack.ps1 (MCPB_PACKAGING_STANDARDS.md
section 2.5); scripts/just/fleet.just still invokes this path, so this file
forwards all arguments instead of duplicating the pipeline.
#>
& "$PSScriptRoot/../mcpb/pack.ps1" @args
