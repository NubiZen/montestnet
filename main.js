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
const blessed = require("blessed");

class Application {
  constructor(privateKey, selectedServiceKey) {
    this.privateKey = privateKey;
    this.selectedServiceKey = selectedServiceKey;
    this.services = {};
    this.transactionHistory = [];
    this.cycleCount = 0;
    this.tokenService = new TokenService();
  }

  initializeDashboard(sharedDashboard) {
    console.log("[Dashboard] Assigning shared dashboard...");
    this.dashboard = sharedDashboard;
    this.dashboard.screen.render();
    console.log("[Dashboard] Shared dashboard assigned successfully");
  }

  async initialize() {
    try {
      console.log(`[Initialize] Starting initialization for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      this.dashboard.updateTable([["Initializing...", "Pending", new Date().toLocaleTimeString()]]);
      this.dashboard.updateLog("Initializing service(s)...");
      this.dashboard.updateStatus("Initializing");

      const provider = new ethers.JsonRpcProvider(config.network.rpc);
      const wallet = new ethers.Wallet(this.privateKey, provider);
      this.walletAddress = wallet.address;
      this.wallet = wallet;
      this.dashboard.updateWallet(Utils.maskedWallet(wallet.address));
      console.log(`[Initialize] Wallet initialized - Address: ${Utils.maskedWallet(wallet.address)}`);

      const tokens = await this.tokenService.getTokenBalances(wallet.address);
      this.dashboard.updateTokens(tokens);
      console.log(`[Initialize] Token balances: ${JSON.stringify(tokens)}`);

      const balance = await provider.getBalance(wallet.address);
      const formattedBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      this.dashboard.updateBalance(formattedBalance);
      this.dashboard.updateNetwork("Monad Testnet");
      this.dashboard.setCycles(0, config.cycles.default);
      console.log(`[Initialize] Wallet balance: ${formattedBalance} MON`);

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

      if (this.selectedServiceKey === "all") {
        for (const [key, info] of Object.entries(services)) {
          console.log(`[Initialize] Initializing ${info.name}...`);
          this.dashboard.updateLog(`Initializing ${info.name}...`);
          if (info.address) {
            this.services[key] = new info.service(info.address, wallet);
          } else {
            this.services[key] = new info.service(wallet);
          }
          await this.services[key].initialize();
          this.dashboard.updateLog(`${info.name} initialized successfully`);
          console.log(`[Initialize] ${info.name} initialized successfully`);
        }
        this.dashboard.updateTable([["All Services", "Active", new Date().toLocaleTimeString()]]);
      } else {
        const info = services[this.selectedServiceKey];
        console.log(`[Initialize] Initializing ${info.name}...`);
        this.dashboard.updateLog(`Initializing ${info.name}...`);
        if (info.address) {
          this.services[this.selectedServiceKey] = new info.service(info.address, wallet);
        } else {
          this.services[this.selectedServiceKey] = new info.service(wallet);
        }
        await this.services[this.selectedServiceKey].initialize();
        this.dashboard.updateLog(`${info.name} initialized successfully`);
        console.log(`[Initialize] ${info.name} initialized successfully`);
        this.dashboard.updateTable([[info.name, "Active", new Date().toLocaleTimeString()]]);
      }

      this.dashboard.updateStatus("Active");
      console.log(`[Initialize] Service(s) initialized successfully for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      return true;
    } catch (error) {
      console.error(`[Initialize] Initialization error: ${error.message}`);
      this.dashboard.updateLog(`Initialization error: ${error.message}`);
      this.dashboard.updateStatus("Error");
      return false;
    }
  }

  async start() {
    try {
      console.log(`[Start] Starting Monad Bot for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      this.dashboard.updateLog(`Starting Monad Bot for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      const initialized = await this.initialize();
      if (!initialized) throw new Error("Failed to initialize service(s)");

      console.log("[Start] Service(s) initialized. Starting cycles...");
      this.dashboard.updateLog("Service(s) initialized. Starting cycles...");
      for (let i = 0; i < config.cycles.default; i++) {
        this.cycleCount++;
        await this.runCycle();
        if (i < config.cycles.default - 1) {
          const delay = Utils.getRandomDelay();
          console.log(`[Start] Waiting ${delay / 1000} seconds before next cycle...`);
          this.dashboard.updateLog(`Waiting ${delay / 1000} seconds before next cycle...`);
          await Utils.delay(delay);
        }
      }
      console.log(`[Start] Completed cycles for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      this.dashboard.updateLog(`Completed cycles for wallet: ${Utils.maskedWallet(this.walletAddress)}`);
      return true;
    } catch (error) {
      console.error(`[Start] Fatal error: ${error.message}`);
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
      console.log(`[Cycle] Starting cycle ${this.cycleCount} with ${formattedAmount} MON`);
      this.dashboard.updateLog(`Starting cycle ${this.cycleCount} with ${formattedAmount} MON`);

      this.transactionHistory.push({ time: new Date().toLocaleTimeString(), amount: formattedAmount });
      if (this.transactionHistory.length > 10) this.transactionHistory.shift();

      const serviceStatus = [];
      if (this.selectedServiceKey === "all") {
        for (const [name, service] of Object.entries(this.services)) {
          try {
            console.log(`[Cycle] Running ${name}...`);
            serviceStatus.push([name, "Running", new Date().toLocaleTimeString()]);
            this.dashboard.updateTable(serviceStatus);
            this.dashboard.updateLog(`Running ${name}...`);
            if (name === "beanSwap") {
              const wrapResult = await service.wrapMON(amount);
              console.log(`[Cycle] ${name}: Converted MON to USDC - ${wrapResult.status}`);
              this.dashboard.updateLog(`${name}: Converted MON to USDC - ${wrapResult.status}`);
              await Utils.delay(Utils.getRandomDelay());
              const unwrapResult = await service.unwrapMON();
              console.log(`[Cycle] ${name}: Converted USDC to MON - ${unwrapResult.status}`);
              this.dashboard.updateLog(`${name}: Converted USDC to MON - ${unwrapResult.status}`);
            } else if (typeof service.execute === "function") {
              const result = await service.execute(amount);
              console.log(`[Cycle] ${name}: Executed - ${result.status}`);
              this.dashboard.updateLog(`${name}: Executed - ${result.status}`);
            } else if (name === "uniswap") {
              const tokenSymbols = Object.keys(config.contracts.uniswap.tokens);
              const tokenSymbol = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
              const swapEthResult = await service.swapEthForTokens(tokenSymbol, amount);
              this.dashboard.updateLog(`uniswap: Swap MON -> ${tokenSymbol} => ${swapEthResult.status}`);
              await Utils.delay(Utils.getRandomDelay());
              const swapTokenResult = await service.swapTokensForEth(tokenSymbol);
              this.dashboard.updateLog(`uniswap: Swap ${tokenSymbol} -> MON => ${swapTokenResult.status}`);
            } else if (name === "monorail") {
              const monorailResult = await service.sendTransaction();
              this.dashboard.updateLog(`monorail: Transaction sent => ${monorailResult.status}`);
            } else if (name === "deploy") {
              const deployResult = await service.deployContracts(1);
              if (deployResult && deployResult.length > 0) {
                this.dashboard.updateLog(`Deploy contract: ${deployResult[0].status}`);
              } else {
                this.dashboard.updateLog("Deploy contract: Deployment result is empty");
              }
            } else if (name === "kitsu") {
              const stakeKitsuResult = await service.stakeMON();
              this.dashboard.updateLog(`${name}: Staked MON => ${stakeKitsuResult.status}`);
            }
            serviceStatus.pop();
            serviceStatus.push([name, "Active", new Date().toLocaleTimeString()]);
          } catch (error) {
            console.error(`[Cycle] ${name}: Error - ${error.message}`);
            this.dashboard.updateLog(`${name}: Error - ${error.message}`);
            serviceStatus.push([name, "Error", new Date().toLocaleTimeString()]);
          }
        }
      } else {
        const name = this.selectedServiceKey;
        const service = this.services[name];
        try {
          console.log(`[Cycle] Running ${name}...`);
          serviceStatus.push([name, "Running", new Date().toLocaleTimeString()]);
          this.dashboard.updateTable(serviceStatus);
          this.dashboard.updateLog(`Running ${name}...`);
          if (name === "beanSwap") {
            const wrapResult = await service.wrapMON(amount);
            console.log(`[Cycle] ${name}: Converted MON to USDC - ${wrapResult.status}`);
            this.dashboard.updateLog(`${name}: Converted MON to USDC - ${wrapResult.status}`);
            await Utils.delay(Utils.getRandomDelay());
            const unwrapResult = await service.unwrapMON();
            console.log(`[Cycle] ${name}: Converted USDC to MON - ${unwrapResult.status}`);
            this.dashboard.updateLog(`${name}: Converted USDC to MON - ${unwrapResult.status}`);
          } else if (typeof service.execute === "function") {
            const result = await service.execute(amount);
            console.log(`[Cycle] ${name}: Executed - ${result.status}`);
            this.dashboard.updateLog(`${name}: Executed - ${result.status}`);
          } else if (name === "uniswap") {
            const tokenSymbols = Object.keys(config.contracts.uniswap.tokens);
            const tokenSymbol = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
            const swapEthResult = await service.swapEthForTokens(tokenSymbol, amount);
            this.dashboard.updateLog(`uniswap: Swap MON -> ${tokenSymbol} => ${swapEthResult.status}`);
            await Utils.delay(Utils.getRandomDelay());
            const swapTokenResult = await service.swapTokensForEth(tokenSymbol);
            this.dashboard.updateLog(`uniswap: Swap ${tokenSymbol} -> MON => ${swapTokenResult.status}`);
          } else if (name === "monorail") {
            const monorailResult = await service.sendTransaction();
            this.dashboard.updateLog(`monorail: Transaction sent => ${monorailResult.status}`);
          } else if (name === "deploy") {
            const deployResult = await service.deployContracts(1);
            if (deployResult && deployResult.length > 0) {
              this.dashboard.updateLog(`Deploy contract: ${deployResult[0].status}`);
            } else {
              this.dashboard.updateLog("Deploy contract: Deployment result is empty");
            }
          } else if (name ==="kitsu") {
            const stakeKitsuResult = await service.stakeMON();
            this.dashboard.updateLog(`${name}: Staked MON => ${stakeKitsuResult.status}`);
          }
          serviceStatus.pop();
          serviceStatus.push([name, "Active", new Date().toLocaleTimeString()]);
        } catch (error) {
          console.error(`[Cycle] ${name}: Error - ${error.message}`);
          this.dashboard.updateLog(`${name}: Error - ${error.message}`);
          serviceStatus.push([name, "Error", new Date().toLocaleTimeString()]);
        }
      }
      this.dashboard.updateTable(serviceStatus);

      const tokens = await this.tokenService.getTokenBalances(this.wallet.address);
      this.dashboard.updateTokens(tokens);
      console.log(`[Cycle] Updated token balances: ${JSON.stringify(tokens)}`);
      const balanceWei = await this.wallet.provider.getBalance(this.wallet.address);
      const formattedBalanceUpdated = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);
      this.dashboard.updateBalance(formattedBalanceUpdated);
      console.log(`[Cycle] Updated wallet balance: ${formattedBalanceUpdated} MON`);
    } catch (error) {
      console.error(`[Cycle] Cycle error: ${error.message}`);
      this.dashboard.updateLog(`Cycle error: ${error.message}`);
      this.dashboard.updateStatus("Error");
    }
  }
}

if (require.main === module) {
  process.on("unhandledRejection", (error) => {
    console.error("Unhandled rejection:", error);
  });

  const { getPrivateKeys } = Utils;
  let privateKeys;
  try {
    console.log("[Main] Reading private keys...");
    privateKeys = getPrivateKeys();
    if (privateKeys.length === 0) {
      console.error("[Main] No private keys found in private.key file");
      process.exit(1);
    }
    console.log(`[Main] Found ${privateKeys.length} private keys to process`);
  } catch (error) {
    console.error("[Main] Error reading private keys:", error.message);
    process.exit(1);
  }

  async function showServiceMenu(dashboard) {
    return new Promise((resolve) => {
      const services = {
        all: "Run All Services",
        deploy: "Deploy",
        monorail: "Monorail",
        rubicSwap: "Rubic Swap",
        izumiSwap: "Izumi Swap",
        uniswap: "Uniswap",
        beanSwap: "Bean Swap",
        magmaStaking: "Magma Staking",
        aPrioriStaking: "aPriori Staking",
        kitsu: "Kitsu",
      };

      const menu = blessed.list({
        parent: dashboard.screen,
        top: "center",
        left: "center",
        width: "50%",
        height: 13,
        label: "{bold}{cyan-fg}◆ Select Service{/bold}",
        tags: true,
        border: { type: "line", fg: "#00d4ff" },
        style: { fg: "white", bg: "#1c2526", border: { fg: "#00d4ff" }, selected: { bg: "cyan", fg: "black" } },
        keys: true,
        vi: true,
        mouse: true,
        shadow: true,
        items: Object.values(services),
      });

      menu.on("select", (item) => {
        const selectedKey = Object.keys(services).find((key) => services[key] === item.content);
        dashboard.screen.remove(menu);
        dashboard.screen.render();
        resolve(selectedKey);
      });

      menu.focus();
      dashboard.screen.render();
    });
  }

  async function processWallets() {
    let iteration = 0;
    let sharedDashboard = new Dashboard();
    while (true) {
      try {
        iteration++;
        console.log(`[Main] Starting iteration ${iteration} at ${new Date().toLocaleString()}`);

        const selectedServiceKey = await showServiceMenu(sharedDashboard);
        console.log(`[Main] Selected service: ${selectedServiceKey === "all" ? "All Services" : selectedServiceKey}`);

        for (const key of privateKeys) {
          console.log(`[Main] Processing wallet with private key: ${Utils.maskedPrivateKey(key)}`);
          try {
            const app = new Application(key, selectedServiceKey);
            app.initializeDashboard(sharedDashboard);
            console.log("[Main] Connecting to EVM...");
            await evm.connect(key);
            console.log("[Main] EVM connected successfully");
            const success = await app.start();
            if (!success) {
              console.error(`[Main] Failed to complete cycles for wallet: ${Utils.maskedPrivateKey(key)}`);
            } else {
              console.log(`[Main] Successfully completed cycles for wallet: ${Utils.maskedPrivateKey(key)}`);
            }
            await Utils.delay(3000);
          } catch (error) {
            console.error(`[Main] Error processing wallet with private key ${Utils.maskedPrivateKey(key)}: ${error.message}`);
          }
        }

        console.log(`[Main] All wallets processed for iteration ${iteration} at ${new Date().toLocaleString()}`);

        if (selectedServiceKey === "all") {
          console.log("[Main] Waiting 24 hours before the next iteration...");
          await sharedDashboard.showCountdown(24 * 60 * 60 * 1000);
        } else {
          sharedDashboard.screen.destroy();
          sharedDashboard = new Dashboard();
          console.log("[Main] Proceeding to next iteration immediately...");
        }
      } catch (error) {
        console.error(`[Main] Unexpected error in iteration ${iteration}: ${error.message}`);
        console.log("[Main] Waiting 24 hours before the next iteration despite the error...");
        await sharedDashboard.showCountdown(24 * 60 * 60 * 1000);
      }
    }
  }

  processWallets().catch((error) => {
    console.error("[Main] Fatal error in processWallets:", error.message);
    process.exit(1);
  });
}

module.exports = Application;