[CmdletBinding()]
param(

    [Parameter(Mandatory = $true)]
    [PSCustomObject[]]$LegoResultModel

)

<#
    Scan Get-LegoInstruction result and find any products with zero regular expression matches for all instructions
#>

BEGIN {
    function hasInstructionMatch([PSCustomObject[]] $instructions) {
        for ( $i = 0; $i -lt $instructions.Length; $i++) {
            if ( $instructions[$i].matchResult.hasMatch ) {
                return $true
            }
        }
        return $false
    }
}
		
PROCESS {
    for ( $i = 0; $i -lt $LegoResultModel.Length; $i++) {
        $private:legoProduct = $LegoResultModel[$i]
        if ( $null -ne $private:legoProduct.matchResult -And $private:legoProduct.matchResult.hasMatch ) { continue }
        $private:hasInstructionMatch = hasInstructionMatch -instructions $private:legoProduct.instructions
        if ( $private:hasInstructionMatch ) {
            continue
        }

        Write-Output $private:legoProduct
    }
}

END {}