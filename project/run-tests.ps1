param(
    [string[]] $ExtraArgs
)

# Run unit tests quickly by disabling pytest_django and excluding known integration classes.
$runIntegration = $env:RUN_INTEGRATION -eq '1'
Write-Host "RUN_INTEGRATION=$runIntegration"

if ($runIntegration) {
    Write-Host "Running full test suite (integration enabled)..."
    & .venv\Scripts\python.exe -m pytest @($ExtraArgs) -q
} else {
    Write-Host "Running unit tests only (pytest_django disabled)"
    $exclude = 'not BLAgreementRBACTests and not UserManagementRBACTests'
    & .venv\Scripts\python.exe -m pytest -p no:pytest_django -k $exclude @($ExtraArgs) -q
}
