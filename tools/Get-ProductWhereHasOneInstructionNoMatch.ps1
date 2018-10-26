[CmdletBinding()]
param(

    [Parameter(Mandatory = $true)]
    [PSCustomObject[]]$LegoResultModel

)

<#
    Scan Get-LegoInstruction result and find any products with exactly one instruction with zero regular expression match for the instruction
#>

BEGIN {
}
		
PROCESS {
    for ( $i = 0; $i -lt $LegoResultModel.Length; $i++) {
        $private:legoProduct = $LegoResultModel[$i]
        if ( $private:legoProduct.instructions.Length -gt 1 ) { continue }  
        if ( $null -ne $private:legoProduct.matchResult -And $private:legoProduct.matchResult.hasMatch ) { continue }
        if ( $private:legoProduct.instructions[0].matchResult.hasMatch ) { continue }
      
        Write-Output $private:legoProduct
    }
}

END {}