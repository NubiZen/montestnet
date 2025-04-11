const path = require("path");
const { ethers } = require("ethers");
const evm = require('web3connectjs');
const Dashboard = require("./Terminal/Dashboard");
const SwapService = require("./services/SwapService");
const StakingService = require("./services/StakingService");
const aPrioriStakingService = require("./services/aPrioriStakingService");
const BeanswapService = require("./services/BeanSwapService");
const UniswapService = require("./services/UniswapService");
const TokenService = require("./services/TokenService");
const MonorailService = require("./services/MonorailService");
const DeployService = require("./services/DeployService");
const KitsuService = require("./services/KitsuService");
const config = require(path.join(__dirname, "./config/config.json"));
const Utils = require("./lib/utils");

class Application {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.walletAddress = new ethers.Wallet(this.privateKey).address;
    this.initializeDashboard();
    this.services = {};
    this.transactionHistory = [];
    this.cycleCount = 0;
    this.tokenService = new TokenService();
  }

  initializeDashboard() {
    this.dashboard = new Dashboard();
    this.dashboard.screen.render();
  }

  async initialize() {
    try {
      this.dashboard.updateTable([["Initializing...", "Pending", new Date().toLocaleTimeString()]]);
      this.dashboard.updateLog("Initializing services...");
      this.dashboard.updateStatus("Initializing");

      const provider = new ethers.JsonRpcProvider(config.network.rpc);
      const wallet = new ethers.Wallet(this.privateKey, provider);
      this.walletAddress = wallet.address;
      this.wallet = wallet;
      this.dashboard.updateWallet(Utils.maskedWallet(wallet.address));

      const tokens = await this.tokenService.getTokenBalances(wallet.address);
      this.dashboard.updateTokens(tokens);

      const balance = await provider.getBalance(wallet.address);
      const formattedBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      this.dashboard.updateBalance(formattedBalance);
      this.dashboard.updateNetwork("Monad Testnet");
      this.dashboard.setCycles(0, config.cycles.default);

      const services = {
        deploy: { name: "Deploy", service: DeployService },
        monorail: { name: "Monorail", service: MonorailService, address: config.contracts.monorail.router },
        rubicSwap: { name: "Rubic Swap", service: SwapService },
        izumiSwap: { name: "Izumi Swap", service: SwapService },
        uniswap: { name: "Uniswap", service: UniswapService, address: config.contracts.uniswap.router },
        beanSwap: { name: "Bean Swap", service: BeanswapService, address: config.contracts.beanswap.router },
        magmaStaking: { name: "Magma Staking", service: StakingService, address: config.contracts.magma },
        aPrioriStaking: { name: "aPriori Staking", service: aPrioriStakingService, address: config.contracts.aPrioriStaking },
        kitsu: { name: "Kitsu", service: KitsuService, address: config.contracts.kitsu.router },
      };

      for (const [key, info] of Object.entries(services)) {
        this.dashboard.updateLog(`Initializing ${info.name}...`);
        if (info.address) {
          this.services[key] = new info.service(info.address, wallet);
        } else {
          this.services[key] = new info.service(wallet);
        }
        await this.services[key].initialize();
        this.dashboard.updateLog(`${info.name} initialized successfully`);
      }

      this.dashboard.updateStatus("Active");
      return true;
    } catch (error) {
      this.dashboard.updateLog(`Initialization error: ${error.message}`);
      this.dashboard.updateStatus("Error");
      return false;
    }
  }

  async start() {
    try {
      this.dashboard.updateLog(`Starting Monad Bot for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      const initialized = await this.initialize();
      if (!initialized) throw new Error("Failed to initialize services");

      this.dashboard.updateLog("All services initialized. Starting cycles...");
      for (let i = 0; i < config.cycles.default; i++) {
        this.cycleCount++;
        await this.runCycle();
        if (i < config.cycles.default - 1) {
          const delay = Utils.getRandomDelay();
          this.dashboard.updateLog(`Waiting ${delay / 1000} seconds before next cycle...`);
          await Utils.delay(delay);
        }
      }
      this.dashboard.updateLog(`Completed cycles for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      return true;
    } catch (error) {
      this.dashboard.updateLog(`Fatal error: ${error.message}`);
      this.dashboard.updateStatus("Error");
      return false;
    }
  }

  async runCycle() {
    try {
      const amount = Utils.getRandomAmount();
      this.dashboard.setCycles(this.cycleCount, config.cycles.default);
      const formattedAmount = parseFloat(ethers.formatEther(amount)).toFixed(8);
      this.dashboard.updateLog(`Starting cycle ${this.cycleCount} with ${formattedAmount} MON`);

      this.transactionHistory.push({ time: new Date().toLocaleTimeString(), amount: formattedAmount });
      if (this.transactionHistory.length > 10) this.transactionHistory.shift();

      const serviceStatus = [];
      for (const [name, service] of Object.entries(this.services)) {
        try {
          serviceStatus.push([name, "Running", new Date().toLocaleTimeString()]);
          this.dashboard.updateTable(serviceStatus);
          if (name === "beanSwap") {
            const wrapResult = await service.wrapMON(amount);
            this.dashboard.updateLog(`${name}: Converted MON to USDC - ${wrapResult.status}`);
            await Utils.delay(Utils.getRandomDelay());
            const unwrapResult = await service.unwrapMON();
            this.dashboard.updateLog(`${name}: Converted USDC to MON - ${unwrapResult.status}`);
          }
          serviceStatus.pop();
          serviceStatus.push([name, "Active", new Date().toLocaleTimeString()]);
        } catch (error) {
          this.dashboard.updateLog(`${name}: Error - ${error.message}`);
          serviceStatus.push([name, "Error", new Date().toLocaleTimeString()]);
        }
      }
      this.dashboard.updateTable(serviceStatus);

      const tokens = await this.tokenService.getTokenBalances(this.wallet.address);
      this.dashboard.updateTokens(tokens);
      const balanceWei = await this.wallet.provider.getBalance(this.wallet.address);
      const formattedBalanceUpdated = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
      this.dashboard.updateBalance(formattedBalanceUpdated);
    } catch (error) {
      this.dashboard.updateLog(`Cycle error: ${error.message}`);
      this.dashboard.updateStatus("Error");
    }
  }
}

if (require.main === module) {
  const { getPrivateKeys } = Utils;
  const privateKeys = getPrivateKeys();

  async function processWallets() {
    for (const key of privateKeys) {
      console.log(`Processing wallet with private key: ${Utils.maskedWallet(key)}`);
      const app = new Application(key);
      await evm.connect(key);
      await app.start();
      await Utils.delay(3000);
    }
    console.log("All wallets processed.");
  }

  processWallets().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = Application;