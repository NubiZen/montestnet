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
      cursor: { color: "white" },
      style: { bg: "#1c2526" },
    });

    // Banner di atas, memanjang penuh
    this.banner = blessed.box({
      parent: this.screen,
      top: 0,
      height: 3,
      width: "100%",
      align: "center",
      valign: "middle",
      content: "{bold}{magenta-fg}◆ Monad Testnet Automation ◆{/bold}\n{magenta-fg}Github: rpchubs | Telegram: RPC_Community",
      tags: true,
      border: { type: "line", fg: "magenta" },
      style: { fg: "white", bg: "#1c2526" },
      shadow: true,
    });

    // Grid dimulai setelah banner (top: 3)
    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
      top: 3,
    });

    this.initializeComponents();
    this.setupListeners();
  }

  initializeComponents() {
    // Layout baru: lebih seimbang dan memanfaatkan ruang
    this.info = new InfoDisplay(this.grid, 0, 8, 4, 4); // Kanan atas: 4 baris, 4 kolom

    this.log = this.grid.set(0, 0, 8, 8, contrib.log, {
      fg: "#00ff00",
      selectedFg: "#00ff00",
      label: "{bold}{cyan-fg}◆ Transaction Logs{/bold}",
      tags: true,
      border: { type: "line", fg: "#00d4ff" },
      style: { bg: "#1c2526", border: { fg: "#00d4ff" } },
      scrollback: 100,
      scrollbar: { ch: "│", track: { bg: "cyan" }, style: { inverse: true } },
      padding: { left: 1, right: 1 },
      shadow: true,
    });

    this.table = this.grid.set(4, 8, 8, 4, contrib.table, {
      keys: true,
      fg: "#d3d3d3",
      label: "{bold}{cyan-fg}◆ Service Status{/bold}",
      tags: true,
      columnSpacing: 2,
      columnWidth: [15, 10, 15],
      border: { type: "line", fg: "#00d4ff" },
      style: { bg: "#1c2526", border: { fg: "#00d4ff" } },
      shadow: true,
    });

    this.updateTable([["Service", "Status", "Last Update"]]);
    this.screen.render();
  }

  setupListeners() {
    this.screen.key(["escape", "q", "C-c", "C-z"], () => process.exit(0));

    this.screen.on("resize", () => {
      if (this.log) this.log.emit("attach");
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
      this.log.log(`{bold}{green-fg}► [${timestamp}] {/bold}${message}`);
      this.screen.render();
    }
  }

  updateTable(data) {
    if (this.table) {
      const formattedData = data.map(row => {
        const statusColor = row[1] === "Active" ? "{green-fg}" : row[1] === "Error" ? "{red-fg}" : "{yellow-fg}";
        return [row[0], `${statusColor}${row[1]}{/}`, row[2]];
      });
      this.table.setData({
        headers: ["{bold}Service{/bold}", "{bold}Status{/bold}", "{bold}Last Update{/bold}"],
        data: formattedData,
      });
      this.screen.render();
    }
  }

  updateStats(progress) {
    if (this.info) {
      this.info.updateCycle(this.currentCycle || 0, this.totalCycles || 5);
      this.screen.render();
    }
  }

  updateWallet(walletAddress) {
    if (this.info) {
      this.info.updateWallet(walletAddress);
      this.screen.render();
    }
  }

  updateBalance(balance) {
    if (this.info) {
      this.info.updateBalance(balance);
      this.screen.render();
    }
  }

  updateStatus(status) {
    if (this.info) {
      this.info.updateStatus(status);
      this.screen.render();
    }
  }

  updateNetwork(network) {
    if (this.info) {
      this.info.updateNetwork(network);
      this.screen.render();
    }
  }

  updateTokens(tokens) {
    if (this.info) {
      this.info.updateTokens(tokens);
      this.screen.render();
    }
  }

  setCycles(current, total) {
    if (this.info) {
      this.currentCycle = current;
      this.totalCycles = total;
      this.info.updateCycle(current, total);
      this.screen.render();
    }
  }

  showCountdown(totalDelay) {
    return new Promise((resolve) => {
      // Hapus komponen dashboard lama
      if (this.banner) this.banner.detach();
      if (this.log) this.log.detach();
      if (this.table) this.table.detach();
      if (this.info && this.info.infoBox) this.info.infoBox.detach();

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