/**
 * Social Link Handler
 * Terminal-style interactive command execution for social links
 */

const TYPING_DELAY_MS = 50;
const LOADING_DELAY_MS = 1500;

export class SocialLinkHandler {
  private container: HTMLElement | null;
  private links: NodeListOf<HTMLButtonElement>;
  private isProcessing = false;

  constructor() {
    this.container = document.getElementById('commands-container');
    this.links = document.querySelectorAll('.hero-socials button.social-link[data-href]');
    this.bindEvents();
  }

  private bindEvents(): void {
    this.links.forEach((link) => {
      link.addEventListener('click', (e) => this.handleClick(e, link));
    });
  }

  private async handleClick(e: Event, link: HTMLButtonElement): Promise<void> {
    e.preventDefault();

    if (this.isProcessing || !this.container) return;
    this.isProcessing = true;

    const href = link.dataset.href;
    const cmd = link.dataset.cmd;

    if (!href || !cmd) {
      this.isProcessing = false;
      return;
    }

    // Disable all buttons during processing
    this.setButtonsDisabled(true);

    // Create and append command line
    const commandLine = this.createCommandLine();
    this.container.appendChild(commandLine);

    const typedCommand = commandLine.querySelector<HTMLElement>('.typed-command');
    const loadingDots = commandLine.querySelector<HTMLElement>('.loading-dots');

    if (typedCommand && loadingDots) {
      // Type the command character by character
      await this.typeCommand(typedCommand, cmd);

      // Show loading dots
      loadingDots.style.display = 'inline-block';

      // Wait then execute action
      await this.delay(LOADING_DELAY_MS);

      // Execute the action
      this.executeAction(href, link.dataset.download);

      // Hide loading dots
      loadingDots.style.display = 'none';
    }

    // Re-enable buttons
    this.setButtonsDisabled(false);
    this.isProcessing = false;
  }

  private createCommandLine(): HTMLDivElement {
    const commandLine = document.createElement('div');
    commandLine.className = 'terminal-line interactive-line';
    commandLine.innerHTML = `
      <span class="prompt">$</span>
      <span class="typed-command"></span>
      <span class="loading-dots" style="display: none;"></span>
    `;
    return commandLine;
  }

  private async typeCommand(element: HTMLElement, text: string): Promise<void> {
    for (const char of text) {
      await this.delay(TYPING_DELAY_MS);
      element.textContent += char;
    }
  }

  private executeAction(href: string, downloadName?: string): void {
    if (downloadName) {
      // Trigger download
      const a = document.createElement('a');
      a.href = href;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Open external link
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }

  private setButtonsDisabled(disabled: boolean): void {
    this.links.forEach((btn) => {
      if (disabled) {
        btn.setAttribute('disabled', 'true');
      } else {
        btn.removeAttribute('disabled');
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Initialize the social link handler when DOM is ready
 */
export function initSocialLinkHandler(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new SocialLinkHandler();
    });
  } else {
    new SocialLinkHandler();
  }
}
