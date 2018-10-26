[CmdletBinding()]
param(

    [Parameter(Mandatory = $true)]
    [PSCustomObject[]]$legoResultModelLeft,
    [PSCustomObject[]]$legoResultModelRight

)

<#
    Compare two lego Get-LegoInstruction result models.
    1. Verify the product count matches
    2. Verify contents of each product match between the left and the right.

    The output is the results of the compare including the left and right data entries.
#>

BEGIN {
    function New-CompareResult() {
        Write-Output @{
            Result = $null;
            # Reason = $null; # if false       
        }
    }
    function New-CompareModel() {
        Write-Output @{
            MatchItems     = [System.Collections.ArrayList]::new();
            DifferentItems = [System.Collections.ArrayList]::new();
        }
    }

    function New-CompareItemModel() {
        Write-Output @{
            Left          = $null;
            Right         = $null;
        }
    }

    function CompareModelSet([PSCustomObject]$leftLegoResult, [PSCustomObject]$rightLegoResult) {
        $private:compareResult = New-CompareResult

        $private:leftLength = $leftLegoResult.Length
        $private:rightLength = $rightLegoResult.Length
    
        $private:compareResult.Result = $private:leftLength -eq $private:rightLength
    
        if ( ! $private:compareResult.Result ) {
            $private:compareResult.Reason = "product count are equal assert failed (Left = $($private:leftLength)) (Right = $($private:rightLength))"
        }

        return $private:compareResult
    }
    function IsInstructionFileMatch( [PSCustomObject]$leftInstructionFile, [PSCustomObject]$rightInstructionFile) {
        $private:compareResult = New-CompareResult

        if ( $leftInstructionFile.filePath -ne $rightInstructionFile.filePath) { 
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "instruction file path are equal assert failed (Left = $($leftInstructionFile.filePath)) (Right = $($rightInstructionFile.filePath)"
            return $private:compareResult 
        }
        
        if ( $leftInstructionFile.isNew -ne $rightInstructionFile.isNew) { 
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "instruction file is new are equal assert failed (Left = $($leftInstructionFile.isNew)) (Right = $($rightInstructionFile.isNew)"
            return $private:compareResult 
        }

        $private:compareResult.Result = $true
        return  $private:compareResult
    }

    function CompareMatchResult( [PSCustomObject]$leftMatchResult, [PSCustomObject]$rightMatchResult) {
        $private:compareResult = New-CompareResult
        
        if ( $leftMatchResult.hasMatch -ne $rightMatchResult.hasMatch) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "match result hasMatch are equal assert failed (Left = $($leftMatchResult.hasMatch)) (Right = $($rightMatchResult.hasMatch))"
            return $private:compareResult 
        }

        if ( $leftMatchResult.isDesired -ne $rightMatchResult.isDesired) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "match result isDesired are equal assert failed (Left = $($leftMatchResult.isDesired)) (Right = $($rightMatchResult.isDesired))"
            return $private:compareResult 
        }

        if ( $leftMatchResult.regEx -ne $rightMatchResult.regEx) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "match result regEx are equal assert failed (Left = $($leftMatchResult.regEx)) (Right = $($rightMatchResult.regEx))"
            return $private:compareResult 
        }

        $private:compareResult.Result = $true
        return  $private:compareResult
    }
    function IsInstructionMatch([PSCustomObject]$leftInstruction, [PSCustomObject]$rightInstruction) {
        $private:compareResult = New-CompareResult

        if ( $leftInstruction.description -ne $rightInstruction.description) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "instruction description are equal assert failed (Left = $($leftInstruction.description)) (Right = $($rightInstruction.description))"
            return $private:compareResult 
        }

        if ( ( $null -eq $leftInstruction.fileInfo ) -And ($null -eq $rightInstruction.fileInfo ) ) { 
            $private:compareResult.Result = $true
            return $private:compareResult
        }

        $private:compareResult = IsInstructionFileMatch -leftInstructionFile $leftInstruction.fileInfo -rightInstructionFile $rightInstruction.fileInfo
        if ( ! $private:compareResult.Result ) { 
            return $private:compareResult 
        }

        if ($null -eq $leftInstruction.matchResult -And $null -eq $rightInstruction.matchResult) {
            <#
                do not exit early but this condition needs to be checked.
            #>
            $private:compareResult.Result = $true
        }
        elseif ( $null -eq $leftInstruction.matchResult -Or $null -eq $rightInstruction.matchResult ) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "instruction matchResult are equal assert failed (Left = $($leftInstruction.matchResult)) (Right = $($rightInstruction.matchResult))"
            return $private:compareResult
        }
        else {
            $private:compareResult = CompareMatchResult -leftMatchResult $leftInstruction.matchResult -rightMatchResult $rightInstruction.matchResult
    
            if ( ! $private:compareResult.Result ) { 
                $private:compareResult.Reason = "instruction " + $private:compareResult.Reason
                return $private:compareResult 
            }
        }

        $private:compareResult.Result = $true
        return $private:compareResult
    }
    function IsProductMatch([PSCustomObject]$leftProduct, [PSCustomObject]$rightProduct) {        
        $private:compareResult = New-CompareResult

        if ( $private:leftProduct.id -ne $private:rightProduct.id ) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "product Id are equal assert failed (Left = $($private:leftProduct.id)) (Right = $($private:rightProduct.id))"
            return $private:compareResult
        }

        if ( $null -eq $private:leftProduct.matchResult -And $null -eq $private:rightProduct.matchResult ) {
            <#
                do not exit early but this condition needs to be checked.
            #>
            $private:compareResult.Result = $true
        }
        elseif ( $null -eq $private:leftProduct.matchResult -Or $null -eq $private:rightProduct.matchResult ) {
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "product matchResult are equal assert failed (Left = $($private:leftProduct.matchResult)) (Right = $($private:rightProduct.matchResult))"
            return $private:compareResult
        }
        else {
            $private:compareResult = CompareMatchResult -leftMatchResult $private:leftProduct.matchResult -rightMatchResult $private:rightProduct.matchResult
    
            if ( ! $private:compareResult.Result ) { 
                $private:compareResult.Reason = "product " + $private:compareResult.Reason
                return $private:compareResult 
            }
        }

        $private:leftInstructionLength = $private:leftProduct.instructions.Length
        $private:rightInstructionLength = $private:rightProduct.instructions.Length
        if ( $private:leftInstructionLength -ne $private:rightInstructionLength ) { 
            $private:compareResult.Result = $false
            $private:compareResult.Reason = "product instruction count are equal assertr failed (Left = $($private:leftInstructionLength)) (Right = $($private:rightInstructionLength))"
            return $private:compareResult
        }

        if ( $private:leftInstructionLength -eq 0 ) { return $true }

        $private:leftSortedInstructions = $private:leftProduct.instructions | Sort-Object -Property description
        $private:rightSortedInstructions = $private:rightProduct.instructions | Sort-Object -Property description

        for ( $i = 0; $i -lt $private:leftInstructionLength; $i++ ) {
            $private:compareResult = IsInstructionMatch -leftInstruction $private:leftSortedInstructions[$i] -rightInstruction $private:rightSortedInstructions[$i]
            if ( ! $private:compareResult.Result ) {
                return $private:compareResult 
            }
        }

        $private:compareResult.Result = $true
        return $private:compareResult
    }
}
		
PROCESS {
    $private:compareModel = New-CompareModel
    $private:leftLength = $legoResultModelLeft.Length
   
    $private:compareResult = CompareModelSet -leftLegoResult $legoResultModelLeft -rightLegoResult $legoResultModelRight
    
    if ( ! $private:compareResult.Result ) {
        $private:compareModel.CompareResult = $private:compareResult
    }
    
    if ( $private:compareResult.Result) {
        for ( $i = 0; $i -lt $private:leftLength; $i++ ) {
            $private:leftItem = $legoResultModelLeft[$i]
            $private:rightItem = $legoResultModelRight[$i]
            $private:compareItem = New-CompareItemModel
            $private:compareItem.Left = $private:leftItem
            $private:compareItem.Right = $private:rightItem

            $private:productCompareResult = IsProductMatch -leftProduct $private:leftItem -rightProduct $private:rightItem
            $private:compareItem.CompareResult = $private:productCompareResult

            if ( $private:productCompareResult.Result ) {
                [void]$private:compareModel.MatchItems.Add($private:compareItem)
            }
            else {
                [void]$private:compareModel.DifferentItems.Add($private:compareItem)
            }
        }
    }
    Write-Output $private:compareModel
}

END {}