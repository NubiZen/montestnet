const blessed = require("blessed");
const contrib = require("blessed-contrib");
const InfoDisplay = require("./InfoDisplay");

class Dashboard {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Monad Transaction Dashboard",
      autoPadding: true,
      fullUnicode: true,
      style: { bg: "#1c2526" },
    });

    this.banner = blessed.box({
      parent: this.screen,
      top: 0,
      height: 3,
      width: "100%",
      align: "center",
      valign: "middle",
      content: "{bold}{magenta-fg}◆ Monad Testnet Automation",
      tags: true,
      border: { type: "line", fg: "magenta" },
      style: { fg: "white", bg: "#1c2526" },
      shadow: true,
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
      top: 3,
    });

    this.pendingUpdates = {}; // Store pending UI updates
    this.initializeComponents();
    this.setupListeners();
  }

  initializeComponents() {
    this.info = new InfoDisplay(this.grid, 0, 8, 4, 4);

    this.log = this.grid.set(0, 0, 8, 8, contrib.log, {
      fg: "#00ff00",
      selectedFg: "#00ff00",
      label: "{bold}{cyan-fg}◆ Transaction Logs {/bold}",
      tags: true,
      border: { type: "line", fg: "#00d4ff" },
      style: { bg: "#1c2526", border: { fg: "#00d4ff" } },
      scrollback: 100,
      scrollbar: { ch: "│", track: { bg: "cyan" }, style: { inverse: true } },
      padding: { left: 1, right: 1 },
      shadow: true,
    });

    this.table = this.grid.set(4, 8, 6, 4, contrib.table, {
      keys: true,
      fg: "#d3d3d3",
      label: "{bold}{cyan-fg}◆ Service Status {/bold}",
      tags: true,
      columnSpacing: 2,
      columnWidth: [20, 12, 20],
      border: { type: "line", fg: "#00d4ff" },
      style: { bg: "#1c2526", border: { fg: "#00d4ff" } },
      shadow: true,
      truncate: true,
    });

    this.updateTable([["Service", "Status", "Last Update"]]);
  }

  setupListeners() {
    this.screen.key(["escape", "q", "C-c", "C-z"], () => process.exit(0));

    this.screen.on("resize", () => {
      if (this.log) this.log.emit("attach");
      if (this.info) this.info.infoBox.emit("attach");
      if (this.table) this.table.emit("attach");
      this.screen.render();
    });

    if (this.log) {
      this.log.on("click", function (mouse) {
        if (mouse.button === "right") {
          this.setScrollPerc(100);
        } else {
          this.scroll(mouse.button === "left" ? -1 : 1);
        }
        this.screen.render();
      });
    }
  }

  updateLog(message) {
    if (this.log) {
      const timestamp = new Date().toLocaleTimeString();
      this.pendingUpdates.log = `{bold}{green-fg}► [${timestamp}] {/bold}${message}`;
    }
  }

  updateTable(data) {
    if (this.table) {
      const formattedData = data.map(row => {
        const statusColor = row[1] === "Active" ? "{green-fg}" : row[1] === "Error" ? "{red-fg}" : "{yellow-fg}";
        const service = row[0].length > 18 ? row[0].slice(0, 15) + "..." : row[0];
        const status = row[1].length > 10 ? row[1].slice(0, 7) + "..." : `${statusColor}${row[1]}{/}`;
        const lastUpdate = row[2].length > 18 ? row[2].slice(0, 15) + "..." : row[2];
        return [service, status, lastUpdate];
      });
      this.pendingUpdates.table = {
        headers: ["{bold}Service{/bold}", "{bold}Status{/bold}", "{bold}Last Update{/bold}"],
        data: formattedData,
      };
    }
  }

  updateWallet(walletAddress) {
    if (this.info) {
      this.pendingUpdates.wallet = walletAddress;
    }
  }

  updateBalance(balance) {
    if (this.info) {
      this.pendingUpdates.balance = balance;
    }
  }

  updateStatus(status) {
    if (this.info) {
      this.pendingUpdates.status = status;
    }
  }

  updateNetwork(network) {
    if (this.info) {
      this.pendingUpdates.network = network;
    }
  }

  updateTokens(tokens) {
    if (this.info) {
      this.pendingUpdates.tokens = tokens;
    }
  }

  updateCycles(current, total) {
    if (this.info) {
      this.pendingUpdates.cycles = { current, total };
    }
  }

  updateStats(progress) {
    this.updateLog(`Progress: ${progress.toFixed(2)}%`);
  }

  updateLineChart(data) {
    // Tidak digunakan karena line chart dihapus
  }

  render() {
    // Apply all pending updates and render once
    if (this.pendingUpdates.log) {
      this.log.log(this.pendingUpdates.log);
      delete this.pendingUpdates.log;
    }
    if (this.pendingUpdates.table) {
      this.table.setData(this.pendingUpdates.table);
      delete this.pendingUpdates.table;
    }
    if (this.pendingUpdates.wallet) {
      this.info.updateWallet(this.pendingUpdates.wallet);
      delete this.pendingUpdates.wallet;
    }
    if (this.pendingUpdates.balance) {
      this.info.updateBalance(this.pendingUpdates.balance);
      delete this.pendingUpdates.balance;
    }
    if (this.pendingUpdates.status) {
      this.info.updateStatus(this.pendingUpdates.status);
      delete this.pendingUpdates.status;
    }
    if (this.pendingUpdates.network) {
      this.info.updateNetwork(this.pendingUpdates.network);
      delete this.pendingUpdates.network;
    }
    if (this.pendingUpdates.tokens) {
      this.info.updateTokens(this.pendingUpdates.tokens);
      delete this.pendingUpdates.tokens;
    }
    if (this.pendingUpdates.cycles) {
      this.info.updateCycle(this.pendingUpdates.cycles.current, this.pendingUpdates.cycles.total);
      delete this.pendingUpdates.cycles;
    }
    this.screen.render();
  }

  showCountdown(totalDelay) {
    return new Promise((resolve) => {
      if (this.banner) this.banner.detach();
      if (this.log) this.log.detach();
      if (this.info && this.info.infoBox) this.info.infoBox.detach();
      if (this.table) this.table.detach();

      const countdownBox = blessed.box({
        parent: this.screen,
        top: "center",
        left: "center",
        width: "50%",
        height: 5,
        align: "center",
        valign: "middle",
        content: "{bold}Waiting for next iteration...{/bold}\nTime remaining: 24:00:00",
        tags: true,
        border: { type: "line", fg: "#00d4ff" },
        style: { fg: "white", bg: "#1c2526", border: { fg: "#00d4ff" } },
        shadow: true,
      });

      let remainingTime = totalDelay;
      const countdownInterval = setInterval(() => {
        if (remainingTime <= 0) {
          clearInterval(countdownInterval);
          countdownBox.detach();
          this.screen.render();
          resolve();
          return;
        }
        remainingTime -= 1000;
        const hours = Math.floor(remainingTime / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        countdownBox.setContent(
          `{bold}Waiting for next iteration...{/bold}\nTime remaining: ${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
        this.screen.render();
      }, 1000);
    });
  }
}

module.exports = Dashboard;