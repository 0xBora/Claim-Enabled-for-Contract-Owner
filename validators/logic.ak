use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{
  OutputReference, ScriptContext, Spend, Transaction, TransactionId,
}
use aiken/transaction/credential.{VerificationKey}

type Datum {
  owner: Hash<Blake2b_224, VerificationKey>,
}

type Redeemer {
  Redeemer
}

// EXAMPLE of "const datum = Data.to(new Constr(0, [publicKeyHash]));"" 
//type MintAction {
//  Mint { VerificationKey, Int, ByteArray}
//  Burn { Int, PolicyId, Int}
//  Extra
//}

// In Aiken, this validator will not run for the whole contract, it will run one by one on every utxo. The datum you defined here as a parameter is the datum of the UTxO that is currently being validated. Script context is general.
validator(p: PolicyId) {
  fn validate_withdrawal(
    datum: Datum,
    _redeemer: Redeemer,
    context: ScriptContext,
  ) -> Bool {
    // Checks if the transaction is signed by the owner specified in the datum
    let must_be_signed_by_owner =
      list.has(context.transaction.extra_signatories, datum.owner)
    must_be_signed_by_owner
  }
}

// Transactions { inputs, .. }

// expect Some(ownIn) =
//  find(inputs, fn(input) list.has(policies(input.output.value) p)

// any(
//  outputs,
//  fn(output) {
//    list.has(output.value, p)
//    output.address == input.output.address
//  }
//)

test validate_withdrawal_success_by_owner() {
  let owner_key_hash =
    #"0000000000000000000000000000000000000000000000000000000000000000"
  let datum = Datum { owner: owner_key_hash }
  let redeemer = Redeemer

  let placeholder_utxo =
    OutputReference { transaction_id: TransactionId(""), output_index: 0 }
  let context =
    ScriptContext {
      purpose: Spend(placeholder_utxo),
      transaction: transaction.placeholder()
        |> fn(transaction) {
            Transaction { ..transaction, extra_signatories: [datum.owner] }
          },
    }
  validate_withdrawal(datum, redeemer, context)
}

test validate_withdrawal_failure_by_non_owner() {
  let non_owner_key_hash =
    #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  // For example: this represents a non-owners hash
  let datum =
    Datum {
      owner: #"0000000000000000000000000000000000000000000000000000000000000000",
    }
  // The actual contract owners hash
  let redeemer = Redeemer

  let placeholder_utxo =
    OutputReference { transaction_id: TransactionId(""), output_index: 0 }

  let context =
    ScriptContext {
      purpose: Spend(placeholder_utxo),
      transaction: transaction.placeholder()
        |> fn(transaction) {
            Transaction {
              ..transaction,
              extra_signatories: [non_owner_key_hash],
            }
          },
    }
  // using the non-owner key hash
  validate_withdrawal(datum, redeemer, context) == False
}
