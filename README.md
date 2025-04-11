# **Monad Testnet Auto TX Bot**  
![Monad-BOT](https://img.shields.io/badge/Monad-BOT-blue.svg) ![License](https://img.shields.io/badge/License-ISC-green.svg) ![Platform](https://img.shields.io/badge/Platform-MacOS%2FLinux%2FWindows-lightgrey.svg)

A high-performance, automated tool designed for seamless interaction with the **Monad Testnet**. This bot simplifies complex token workflows such as **wrapping/unwrapping**, **swapping**, and **staking** across multiple platformsâ€”all managed from a **real-time interactive dashboard**.

---

## Features

- **Live Terminal Dashboard**  
  Track wallet balances, transaction status, and operation logs in real time.

- **Fully Automated Task Cycles**  
  Swap, stake, and manage tokens with customizable automation logic.

- **Smart Contract Integration**  
  Powered by `ethers.js` for secure, gas-efficient smart contract interaction.

- **Multi-DEX and Staking Platform Support**  
  Integrates with Uniswap, Rubic, Izumi, Magma, aPriori, Kintsu, and more.

- **Secure Private Key Handling**  
  Read-only access from `private.key` file. Multi-wallet support included.

- **Custom Configurations**  
  Fine-tune delay intervals, contract addresses, cycle rules, and RPC endpoints.

---

### Installation

### Prerequisites
Ensure the following are installed:
- [Node.js (v16+)](https://nodejs.org/)
- Git (optional for cloning)

---

### MacOS / Linux
```bash
# Clone the repository
git clone https://github.com/nubizen/Montest.git
cd Montest

# Install dependencies
npm install

# Add your private key(s)
nano private.key

# Run the bot
npm start
```

---

### Windows
```powershell
# Clone the repository
git clone https://github.com/nubizen/Montest.git
cd Montest

# Install dependencies
npm install

# Add your private key(s)
notepad private.key

# Run the bot
npm start
```

---

## Configuration

Edit `config/config.json` to match your preferences:

| Key                | Description                                      |
|--------------------|--------------------------------------------------|
| `rpcUrl`           | Custom RPC endpoint for Monad Testnet            |
| `contractAddresses`| Addresses of staking/swap contracts              |
| `delay`, `cooldown`| Timing configuration for operations              |
| `explorer`         | Block explorer for TX links                      |

---

##   How to Use

Once started, the terminal dashboard will show:

- **Wallet Balances**
- **Swap/Staking Status**
- **Transaction Logs**
- **Cycle Progress**
- **Multi-wallet Execution**

Use `private.key` to list multiple wallets, each processed in randomized cycles.

---

## ”— Supported Integrations

| Function       | Platforms Supported                                             |
|----------------|------------------------------------------------------------------|
| **Swapping**   | Uniswap, Rubic Swap, Izumi Swap, Bean Swap, Monorail            |
| **Staking**    | Magma, aPriori, Kintsu                                          |
| **Tx Actions** | Random MON transfers, smart contract deployment (testnet only)  |
| **Utilities**  | Token wrapping/unwrapping, balance checks                       |

---

## •’ Last Updated  
**Fri Apr 11 03:09:46 UTC 2025**

---

## “„ License  
Licensed under the **ISC License**.