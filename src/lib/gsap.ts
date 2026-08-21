import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// 注册所有插件
gsap.registerPlugin(ScrollTrigger, SplitText, ScrollToPlugin);

// 默认配置
gsap.defaults({
  ease: 'power2.out',
  duration: 0.8,
});

// 工具函数：数字递增动画
export function animateNumber(
  element: HTMLElement | string,
  start: number,
  end: number,
  duration: number = 2
) {
  const obj = { value: start };
  return gsap.to(obj, {
    value: end,
    duration,
    ease: 'power2.out',
    onUpdate() {
      const target = typeof element === 'string'
        ? document.querySelector(element)
        : element;
      if (target) {
        target.textContent = Math.round(obj.value).toLocaleString();
      }
    },
  });
}

// 工具函数：创建无缝循环动画（用于 marquee）
export function createSeamlessLoop(
  targets: string | Element | Element[],
  vars: gsap.TweenVars
) {
  const elements = gsap.utils.toArray(targets);
  const tl = gsap.timeline({
    repeat: -1,
    paused: true,
  });

  elements.forEach((element: any) => {
    tl.to(element, { ...vars }, 0);
  });

  return tl;
}

// 工具函数：淡入上移动画
export function fadeInUp(targets: string | Element | Element[], vars: gsap.TweenVars = {}) {
  return gsap.from(targets, {
    y: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    ...vars,
  });
}

// 工具函数：淡入左移动画
export function fadeInLeft(targets: string | Element | Element[], vars: gsap.TweenVars = {}) {
  return gsap.from(targets, {
    x: 50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    ...vars,
  });
}

// 工具函数：淡入右移动画
export function fadeInRight(targets: string | Element | Element[], vars: gsap.TweenVars = {}) {
  return gsap.from(targets, {
    x: -50,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    ...vars,
  });
}

// 工具函数：缩放淡入动画
export function scaleIn(targets: string | Element | Element[], vars: gsap.TweenVars = {}) {
  return gsap.from(targets, {
    scale: 0.9,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    ...vars,
  });
}

// 批量创建 ScrollTrigger 动画
export function batchScrollTrigger(
  targets: string,
  animationFn: (element: Element) => gsap.core.Tween | gsap.core.Timeline
) {
  const elements = gsap.utils.toArray(targets);

  elements.forEach((element: any) => {
    const animation = animationFn(element);

    ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      end: 'bottom 15%',
      onEnter: () => animation.restart(),
      onEnterBack: () => animation.restart(),
      onLeave: () => animation.pause(0),
      onLeaveBack: () => animation.pause(0),
    });
  });
}

export { gsap, ScrollTrigger, SplitText, ScrollToPlugin };
