[CmdletBinding()]
param(

[Parameter(Mandatory=$True)]
[string]$InstructionResultPath

)


BEGIN {}
		
PROCESS 
{
    $private:resultModel = get-content -Path $InstructionResultPath | ConvertFrom-Json
    Write-Output $private:resultModel
}

END {}