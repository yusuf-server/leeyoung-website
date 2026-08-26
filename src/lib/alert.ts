/**
 * Custom Alert System
 * 替换浏览器原生alert，使用网站配色
 */

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  buttonText?: string;
  onConfirm?: () => void;
  dismissible?: boolean;
}

class CustomAlert {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;

  constructor() {
    // 创建容器（首次调用时）
    if (typeof window !== 'undefined') {
      this.createContainer();
    }
  }

  private createContainer() {
    if (this.container) return;

    // 创建遮罩层
    this.overlay = document.createElement('div');
    this.overlay.className = 'custom-alert-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(4px);
      z-index: 9998;
      display: none;
      animation: fadeIn 0.2s ease-out;
    `;

    // 创建alert容器
    this.container = document.createElement('div');
    this.container.className = 'custom-alert-container';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      display: none;
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.container);

    // 添加动画样式
    if (!document.getElementById('custom-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-alert-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .custom-alert-container {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `;
      document.head.appendChild(style);
    }
  }

  show(options: AlertOptions) {
    if (!this.container || !this.overlay) return;

    const {
      title,
      message,
      type = 'info',
      buttonText = 'OK',
      onConfirm,
      dismissible = true,
    } = options;

    // 图标映射
    const icons = {
      info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>`,
      success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>`,
      error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>`,
      warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>`,
    };

    // 创建alert内容
    this.container.innerHTML = `
      <div class="custom-alert-card" style="
        background: #000;
        border: 2px solid #FFD700;
        border-radius: 12px;
        padding: 2rem;
        max-width: 90vw;
        width: 420px;
        box-shadow: 0 20px 60px rgba(255, 215, 0, 0.3);
        position: relative;
      ">
        ${dismissible ? `
          <button class="custom-alert-close" style="
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: transparent;
            border: none;
            color: #FFD700;
            cursor: pointer;
            padding: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(255,215,0,0.1)'" onmouseout="this.style.background='transparent'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        ` : ''}

        <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="
            flex-shrink: 0;
            width: 48px;
            height: 48px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFD700;
          ">
            ${icons[type]}
          </div>
          <div style="flex: 1; padding-top: 0.25rem;">
            ${title ? `
              <h3 style="
                font-size: 1.25rem;
                font-weight: 700;
                color: #FFD700;
                margin: 0 0 0.5rem 0;
                letter-spacing: 0.02em;
              ">${title}</h3>
            ` : ''}
            <p style="
              font-size: 0.95rem;
              color: #fff;
              margin: 0;
              line-height: 1.6;
            ">${message}</p>
          </div>
        </div>

        <button class="custom-alert-button" style="
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: #FFD700;
          color: #000;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='#FFC700'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(255,215,0,0.4)'" onmouseout="this.style.background='#FFD700'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">${buttonText}</button>
      </div>
    `;

    // 显示alert
    this.overlay.style.display = 'block';
    this.container.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // 绑定事件
    const closeBtn = this.container.querySelector('.custom-alert-close');
    const confirmBtn = this.container.querySelector('.custom-alert-button');

    const close = () => {
      this.hide();
      if (onConfirm) onConfirm();
    };

    if (closeBtn && dismissible) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', close);
    }

    // 点击遮罩层关闭（可选）
    if (dismissible) {
      this.overlay.addEventListener('click', () => this.hide());
    }

    // ESC键关闭
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        this.hide();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  hide() {
    if (this.container && this.overlay) {
      this.overlay.style.display = 'none';
      this.container.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
}

// 创建全局实例
const customAlert = new CustomAlert();

// 导出简化的调用方法
export function showAlert(message: string, title?: string, type?: 'info' | 'success' | 'error' | 'warning') {
  customAlert.show({ message, title, type });
}

export function showSuccess(message: string, title: string = 'Success') {
  customAlert.show({ message, title, type: 'success' });
}

export function showError(message: string, title: string = 'Error') {
  customAlert.show({ message, title, type: 'error' });
}

export function showWarning(message: string, title: string = 'Warning') {
  customAlert.show({ message, title, type: 'warning' });
}

export function showInfo(message: string, title: string = 'Info') {
  customAlert.show({ message, title, type: 'info' });
}

export default customAlert;
