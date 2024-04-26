import { Lucid } from "lucid-cardano";
import fs from 'fs/promises';

async function generateWallet() {
  const lucid = await Lucid.new(undefined, "Preview");

  // Generate a new private key
  const privateKey = lucid.utils.generatePrivateKey();
  // Write the private key to a file named 'me.sk'
  await fs.writeFile("me.sk", privateKey);

  // Select the wallet with the generated private key to obtain the address
  const address = await lucid.selectWalletFromPrivateKey(privateKey).wallet.address();
  // Write the address to a file named 'me.addr'
  await fs.writeFile("me.addr", address);

  console.log(`Private key and address generated:
Private key saved to me.sk
Address saved to me.addr`);
}

// Run the generateWallet function and catch any potential errors
generateWallet().catch(console.error);

// Run it with node walletgenerator.js