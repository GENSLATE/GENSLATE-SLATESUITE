# GENSLATE Terminal: shell integration for PowerShell 7 (pwsh) and Windows PowerShell 5.1.
#
# Passed with -NoExit -EncodedCommand after your profile has loaded (commands are not subject
# to the execution policy, unlike script files). Wraps your prompt to mark prompts and
# commands with OSC 133 / 633 and reports the current folder with OSC 9;9, so the terminal
# can track commands, exit codes and the working folder. It prints nothing of its own and
# keeps `$?` and `$LASTEXITCODE` as your prompt left them.
if (-not $Global:__GenslateLoaded) {
    $Global:__GenslateLoaded = $true
    $Global:__GenslateEsc = [string][char]0x1b
    $Global:__GenslateBel = [string][char]0x07
    # The terminal's secret for this shell: appended to each command report so it can't be
    # forged by program output. Hidden from everything the shell starts.
    $Global:__GenslateNonce = $env:GENSLATE_NONCE
    Remove-Item Env:GENSLATE_NONCE -ErrorAction SilentlyContinue
    # Unknown until the first prompt: the startup command itself is in the history by then.
    $Global:__GenslateLastHistoryId = $null
    $Global:__GenslateCommandSent = $false
    $Global:__GenslateOriginalPrompt = $function:prompt

    # VS Code's escaping for OSC 633;E: `\` -> `\\`, `;` -> `\x3b`, control characters -> `\xHH`.
    function Global:__GenslateEscape([string] $Value) {
        if ($null -eq $Value) { return '' }
        $builder = New-Object System.Text.StringBuilder
        foreach ($char in $Value.ToCharArray()) {
            $code = [int] $char
            if ($code -eq 0x5c) { [void] $builder.Append('\\') }
            elseif ($code -eq 0x3b) { [void] $builder.Append('\x3b') }
            elseif ($code -lt 0x20 -or ($code -ge 0x7f -and $code -le 0x9f)) { [void] $builder.Append('\x' + $code.ToString('x2')) }
            else { [void] $builder.Append($char) }
        }
        $builder.ToString()
    }

    function Global:prompt {
        # Read `$?` and `$LASTEXITCODE` before anything here changes them.
        $succeeded = $global:?
        $nativeCode = $global:LASTEXITCODE
        $esc = $Global:__GenslateEsc
        $bel = $Global:__GenslateBel
        $marks = ''

        $last = Get-History -Count 1
        $lastId = if ($null -ne $last) { $last.Id } else { 0 }
        if ($null -eq $Global:__GenslateLastHistoryId) {
            $Global:__GenslateLastHistoryId = $lastId
        }
        elseif ($lastId -ne $Global:__GenslateLastHistoryId) {
            $Global:__GenslateLastHistoryId = $lastId
            if (-not $Global:__GenslateCommandSent) {
                # Without PSReadLine nothing reported the command as it started: do it now.
                $marks += "$esc]633;E;$(__GenslateEscape $last.CommandLine);$Global:__GenslateNonce$bel$esc]133;C$bel"
            }
            $code = 0
            if (-not $succeeded) {
                $code = 1
                if ($nativeCode -is [int] -and $nativeCode -ne 0) { $code = $nativeCode }
            }
            $marks += "$esc]133;D;$code$bel"
        }
        elseif ($Global:__GenslateCommandSent) {
            # An empty line or a parse error: the command never ran.
            $marks += "$esc]133;D$bel"
        }
        $Global:__GenslateCommandSent = $false

        $location = $ExecutionContext.SessionState.Path.CurrentLocation
        if ($location.Provider.Name -eq 'FileSystem') {
            $marks += "$esc]9;9;$($location.ProviderPath)$bel"
        }

        $text = if ($Global:__GenslateOriginalPrompt) { & $Global:__GenslateOriginalPrompt } else { "PS $location$('>' * ($NestedPromptLevel + 1)) " }
        $global:LASTEXITCODE = $nativeCode
        "$marks$esc]133;A$bel$(-join $text)$esc]133;B$bel"
    }

    # PSReadLine hands us each command line as it is accepted: report it before it runs.
    if (Get-Command -Name PSConsoleHostReadLine -CommandType Function -ErrorAction SilentlyContinue) {
        $Global:__GenslateOriginalReadLine = $function:PSConsoleHostReadLine
        function Global:PSConsoleHostReadLine {
            $line = & $Global:__GenslateOriginalReadLine
            $Global:__GenslateCommandSent = $true
            $esc = $Global:__GenslateEsc
            $bel = $Global:__GenslateBel
            [Console]::Write("$esc]633;E;$(__GenslateEscape $line);$Global:__GenslateNonce$bel$esc]133;C$bel")
            $line
        }
    }
}
