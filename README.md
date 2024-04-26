# Claim-Enabled-for-Contract-Owner
## Cardano Smart Contract with Secure Withdrawal via Aiken/Lucid
This Cardano smart contract allows for the secure deposit of ADA, ensuring that only the contract's owner has withdrawal privileges. The off-chain codebase is developed in TypeScript, compiled to JavaScript for Node.js execution. Contract validation is articulated through Aiken, enforcing strict ownership checks for withdrawals

## Setup

### Prerequisites

Before you begin, ensure you have the following installed:
- Aiken (https://aiken-lang.org/)
- Lucid (https://github.com/spacebudz/lucid), in order to have an easier life building transactions
- Node.js

### Installation
Install the required Node.js packages:
```
npm install lucid-cardano
npm install cbor dotenv // I will be working with CBOR and need to manage environment variables through dotenv
npm install --save-dev typescript @types/node
```
Initialize a TypeScript config file:
```
npx tsc --init
```
### Set Up Environment Variables
Input your environment variables using the .env file, including your BLOCKFROST_PROJECT_ID

## Usage
### Step 1: Check Dependencies

First, run the following command to download necessary dependencies:

```
aiken check
```

### Step 2: Generate Keys
Use generate-keys.ts to generate a Cardano Shelley address (public key) and its corresponding secret key (private key). To generate them, run:

```
npm run generate-wallet
```

### Step 3: Obtain Testnet Funds
Funds can be obtained from the Cardano testnet faucet for use in the contract.

### Step 4: Lock Funds into the Contract
To lock (deposit) funds, run:
```
------ PLACEHOLDER ------
```
Successful locking will prompt:
```
1 tADA locked into the contract at:
Tx ID: xxxxxx (You will need this later as the owner to unlock the UTxO)
Datum: xxxxxx
```
### Step 5: Unlock Funds
To withdraw the funds the owner should, ensuring the transaction meets the validator's requirements, run using the Tx ID from the locking action:

```
deno run --allow-net --allow-read --allow-env hello-world-unlock.ts tx_id_from_the_previous_locking_transaction
```
A successful attempt outputs:
```
1 tADA unlocked from the contract
Tx ID: xxxxxxxxx
Redeemer: xxxxxxxxx
```

## Helpful Visualizations:
Here are some screenshots demonstrating the process:

![TX - I-O](https://github.com/0xBora/Hello-to-Aiken/assets/133051383/1b42fd9c-8fb0-498c-b1ae-92a9d9994c91)
![UTXO-Index](https://github.com/0xBora/Hello-to-Aiken/assets/133051383/fabb7214-1fd2-4a22-af0b-af8ee374fad6)

# Alternative Approaches
## Alternative Validator Logic 1
If there are multiple conditions or scripts (pieces of code) that need to be satisfied or executed for a transaction to be considered valid
When overseeing multiple scripts unlocking in one script, particularly those involving value checks, it's advisable to utilize an additional script to prevent double satisfaction
(reference: https://piefayth.github.io/blog/pages/aiken1/)
```
use aiken/transaction.{
    InlineDatum,
    ScriptContext, 
    Redeemer, 
    Spend,
    find_input
}
use aiken/list
use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type OwnerDatum {
    owner: VerificationKeyHash
}

validator {
  fn only_for_owner(
      _datum: Data, 
      _redeemer: Redeemer,
      ctx: ScriptContext
  ) -> Bool {
    let ScriptContext { transaction, purpose } = ctx
    expect Spend(spent_utxo_reference) = purpose 
    expect Some(input) = find_input(
        transaction.inputs, 
        spent_utxo_reference
    )

    expect InlineDatum(maybe_owner_datum) = input.output.datum
    expect owner_datum: OwnerDatum = maybe_owner_datum

    list.has(transaction.extra_signatories, owner_datum.owner)
  }
}
```

### Off-chain Code for Validator Logic 1

#### Locking funds via Deposit.ts:
```
import { Data } from "https://deno.land/x/lucid@0.10.7/mod.ts"

// ... setup Lucid, select a wallet ...
const owner = lucid.utils.getAddressDetails(
  recipientAddress
).paymentCredential!.hash
const datum: OwnerDatum = { owner }

const tx = await lucid.newTx()
  .payToAddressWithData(
    contractAddress,
    {
      inline: Data.to(datum, OwnerDatum)
    },
    {
      lovelace: 50000000n,
    }
  )
  .complete()
```
#### Unlocking funds via Withdrawals.ts:
```
const contractUtxos = await lucid.utxosAt(contractAddress)
const depositUtxo = contractUtxos.find(
  txo => txo.txHash === depositTxHash
)!

const withdrawlTx = await lucid.newTx()
    .collectFrom(
        [depositUtxo],
        Data.void()
    )
    .attachSpendingValidator(ownerValidator)
    .addSigner(recipientAddress)
    .complete()

const withdrawlSigned = await withdrawlTx.sign().complete()
const withdrawlTxHash = await withdrawlSigned.submit()
```

### Difference between Repository Contract and Alternative 1

#### Repository Logic: 
- Uses a Datum type to store the owner's verification key hash.
- Validates withdrawal transactions based on whether the transaction is signed by the owner specified in the datum.

#### Alternative Logic 1:
- Uses a custom data type OwnerDatum directly to represent the owner's verification key hash.
- Validates transactions based on the presence of the owner's verification key hash in the list of transaction signatories.
  
but as deposits, in this case, have no additional requirements and just a safe withdrawal mechanism is expected, I have avoided these alternative logics.

## Alternative Validator Logic 2
I wanted to write the contract logic in Action terms to create a modular contract, the way mynth account code is written modular in the sense of having an Action defined in the validator, that can point out to other actions like the Claim and Deposit function. I like how that architecture seems like:
(reference: https://github.com/MynthAI/account)
```
type Redeemer {
  action: String, // Action: "deposit" (implicit by sending ADA) or "withdraw"
}

// Validator function adapted for simplified deposit and withdrawal
validator {
  fn validate_action(
    datum: Datum,
    redeemer: Redeemer,
    context: ScriptContext,
  ) -> Bool {
    match redeemer.action {
      "withdraw" => {
        // Check if the transaction is signed by the owner
        list.has(context.transaction.extra_signatories, datum.owner)
      },
      // No explicit "deposit" case needed; deposits are implicit
      _ => false // Handle unrecognized actions
    }
  }
}
```

But as I don't have enough experience with them so far, I avoided looking into them further and embraced simplicity
