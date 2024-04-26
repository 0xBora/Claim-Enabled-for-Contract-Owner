// Lucid & Blockfrost Setup 
// The lock file functions as a validator submission to the blockchain. It constructs the transaction and submits it. The first part of the script appears fairly straightforward, and I don't believe you'd ever need to modify it, regardless of the transaction you're building
import {
    Blockfrost,
    C,
    Constr,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    utf8ToHex,
  } from "https://deno.land/x/lucid@0.8.3/mod.ts";
  import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
   
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      Deno.env.get("BLOCKFROST_PROJECT_ID") // On Windows set it with $env:BLOCKFROST_PROJECT_ID = "preview api key" on your terminal
    ),
    "Preview"
  );

lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./me.sk"));
 
const validator = await readValidator();
//it involves creating a validator object which will then read the crucial plutus.json file. Remember, this file acts as a kind of metadata about your contract
// --- Supporting functions
 
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

// applyParamsToScript(validator[0], [policyId])

// MintAction = Data.to(new Constr(0, [ownerPKH, BigInt(9), fromText"Steve"]))
// BurnAction = Data.to(new Constr(1, []))

// Locking funds into the contract
const publicKeyHash = lucid.utils.getAddressDetails(  
    await lucid.wallet.address()
  ).paymentCredential?.hash;
   
  const datum = Data.to(new Constr(0, [publicKeyHash])); //publicKeyHash is inputted into the constructor here as an array to match the representation expected by the validator
   
  const txHash = await lock(1000000n, { into: validator, owner: datum }); //This defines the amount of ADA in Lovelace units (1*10**6 Lovelace equals to 1 ADA), that NEEDS to get locked into a validator while passing along the datum. The "await" function creates a sort of requirement for the tx to check if the minimum required (1 ADA) ADA is already provided into the validator. 
   
  await lucid.awaitTx(txHash);
   
  console.log(`1 tADA locked into the contract at:
      Tx ID: ${txHash}
      Datum: ${datum}
  `);
   
  // --- Supporting functions
   
  async function lock(
    lovelace: bigint,
    { into, owner }: { into: SpendingValidator; owner: string }
  ): Promise<TxHash> {
    const contractAddress = lucid.utils.validatorToAddress(into);
   
    const tx = await lucid
      .newTx()
      .payToContract(contractAddress, { inline: owner }, { lovelace })
      .complete();
   
    const signedTx = await tx.sign().complete();
   
    return signedTx.submit();
  }

  // deno run --allow-net --allow-read --allow-env deposit(using deno).ts
  