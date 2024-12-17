#!/bin/bash

# Constants
tutorialsDirectory="packages"

# Variables
runResults=()
exitCode=0

# Helper function
###################
run_tutorial() {
    local script_root="$1"
    local script_command="$2"
    local script_build="$3"

    # Move to folder
    cd "$tutorialsDirectory/$script_root"
    
    if [ "$script_build" = "true" ]
    then
        # Build
        yarn run build

        # Check build status
        buildStatus=$?
        runResults+=("[$script_root] Build status: $buildStatus")
        if [ $buildStatus -gt 0 ]
        then
            runResults+=("[$script_root] Build ERROR - Check log for more information")
            cd "../.."
            return
        fi
    fi

    # Run tutorial
    yarn run $script_command

    # Check execution status
    execStatus=$?
    runResults+=("[$script_root] Execution status: $execStatus")
    if [ $execStatus -gt 0 ]
    then
        runResults+=("[$script_root] Execution ERROR - Check log for more information")
        exitCode=1
    fi

    # Going to root
    cd "../.."
}

# Run all tutorials
#####################
# We start with eth-withdraw, because we want to save the transaction hash of the withdrawal
# to be used in outbox-exec. Since this script is expected to be run on the nitro-testnode
# confirm periods are much shorter and by the time we run outbox-exec, this withdrawal should
# be ready to be executed
ethWithdrawOutput=$(run_tutorial "eth-withdraw" "withdrawETH")
echo "$ethWithdrawOutput"
withdrawalTransactionHash=$(echo "$ethWithdrawOutput" | tail -1 | grep -oE '0x[a-fA-F0-9]+')

# We now run the rest of the tutorials
run_tutorial "address-table" "exec"
run_tutorial "block-verification-in-parent-chain-assertion" "exec"
run_tutorial "contract-deposit" "start"
run_tutorial "custom-gateway-bridging" "exec"
run_tutorial "custom-token-bridging" "custom-token-bridging"
run_tutorial "delayedInbox-l2msg" "normalTx"
run_tutorial "delayedInbox-l2msg" "withdrawFunds"
run_tutorial "demo-dapp-election" "exec"
run_tutorial "demo-dapp-pet-shop" "exec"
run_tutorial "eth-deposit" "depositETH"
run_tutorial "eth-deposit-to-different-address" "exec"
run_tutorial "gas-estimation" "exec"
run_tutorial "greeter" "greeter"
run_tutorial "token-deposit" "token-deposit"
run_tutorial "token-withdraw" "token-withdraw"

# These two tutorials should be run together. We get the transaction hash from the first one
# and execute the second one using that transaction hash
createFailedRetryableOutput=$(run_tutorial "redeem-pending-retryable" "createFailedRetryable")
echo "$createFailedRetryableOutput"
retryableTransactionHash=$(echo "$createFailedRetryableOutput" | tail -1 | grep -oE '0x[a-fA-F0-9]+')
run_tutorial "redeem-pending-retryable" "redeemPendingRetryable $retryableTransactionHash"

# We finish by running parent-chain-confirmation-checker and outbox-execute
run_tutorial "parent-chain-confirmation-checker" "checkConfirmation --txHash $withdrawalTransactionHash"
run_tutorial "parent-chain-confirmation-checker" "findSubmissionTx --txHash $withdrawalTransactionHash"
run_tutorial "outbox-execute" "outbox-exec $withdrawalTransactionHash"

# Show final results
######################
echo "***********"
echo "* RESULTS *"
echo "***********"
IFS=""
for log in ${runResults[@]}
do
    echo "$log"
done

exit $exitCode