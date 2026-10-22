import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import "./Viewer.css";

type ErrorBoundaryProps = {
    children: ReactNode;
};

type ErrorBoundaryState = {
    error: Error | null;
};

// ErrorBoundary: 接住子元件在 render 期間丟出的錯誤
// - 只有 class component 能當 error boundary，React 沒有對應的 hook
// - 用途：包住 <Canvas>。WebGL 不可用或 three.js 初始化失敗時，把整頁白屏換成一句可讀的訊息
// - 只接得住 render 期的錯誤；useFrame 之類每幀回呼裡的錯誤不在範圍內
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Viewer crashed:", error, info.componentStack);
    }

    render() {
        const { error } = this.state;

        if (error) {
            return (
                <div className="viewer-status viewer-status-error">
                    3D view failed: {error.message}
                </div>
            );
        }

        return this.props.children;
    }
}

export { ErrorBoundary };
