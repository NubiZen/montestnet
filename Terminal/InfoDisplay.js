const blessed = require("blessed");
const contrib = require("blessed-contrib");

class InfoDisplay {
  constructor(grid, row, col, rowSpan, colSpan) {
    this.infoBox = grid.set(row, col, rowSpan, colSpan, blessed.box, {
      label: "{bold}{cyan-fg}◆ Wallet Info{/bold}",
      tags: true,
      border: { type: "line", fg: "#00d4ff" },
      style: { fg: "white", bg: "#1c2526", border: { fg: "#00d4ff" } },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      shadow: true,
      padding: { left: 1, right: 1 },
    });

    this.initializeContent();
  }

  initializeContent() {
    let currentTop = 0;

    this.walletText = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Wallet:{/bold} Unknown",
      tags: true,
      style: { fg: "white", bg: "#1c2526" },
    });
    currentTop += 1;

    this.balanceText = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Balance:{/bold} Checking...",
      tags: true,
      style: { fg: "#00ff00", bg: "#1c2526" },
    });
    currentTop += 1;

    this.networkText = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Network:{/bold} Monad Testnet",
      tags: true,
      style: { fg: "yellow", bg: "#1c2526" },
    });
    currentTop += 1;

    this.statusText = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Status:{/bold} Active",
      tags: true,
      style: { fg: "green", bg: "#1c2526" },
    });
    currentTop += 1;

    this.cycleText = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Cycle:{/bold} 0/0",
      tags: true,
      style: { fg: "magenta", bg: "#1c2526" },
    });
    currentTop += 1;

    this.tokenList = blessed.text({
      parent: this.infoBox,
      top: currentTop,
      left: 0,
      content: "{bold}Tokens:{/bold} Loading...",
      tags: true,
      style: { fg: "cyan", bg: "#1c2526" },
    });
  }

  updateWallet(walletAddress) {
    this.walletText.setContent(`{bold}Wallet:{/bold} ${walletAddress.slice(0, 10)}...`);
    this.infoBox.screen.render();
  }

  updateBalance(balance) {
    this.balanceText.setContent(`{bold}Balance:{/bold} ${balance} MON`);
    this.infoBox.screen.render();
  }

  updateStatus(status) {
    this.statusText.setContent(`{bold}Status:{/bold} ${status}`);
    this.statusText.style.fg = status === "Active" ? "green" : "red";
    this.infoBox.screen.render();
  }

  updateCycle(current, total) {
    this.cycleText.setContent(`{bold}Cycle:{/bold} ${current}/${total}`);
    this.infoBox.screen.render();
  }

  updateNetwork(network) {
    this.networkText.setContent(`{bold}Network:{/bold} ${network}`);
    this.infoBox.screen.render();
  }

  updateTokens(tokens) {
    let content = "{bold}Tokens:{/bold}\n";
    tokens.forEach((token) => {
      content += `  ${token.symbol}: ${token.balance}\n`;
    });
    this.tokenList.setContent(content);
    this.infoBox.screen.render();
  }
}

module.exports = InfoDisplay;