import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const CreateChatPage = lazy(() => import("./pages/CreateChatPage"));
const JoinChatPage = lazy(() => import("./pages/JoinChatPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

function App() {
    return (
        <BrowserRouter>
            <Suspense
                fallback={
                    <div className="flex h-screen items-center justify-center">
                        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                    </div>
                }
            >
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/create" element={<CreateChatPage />} />
                    <Route path="/join" element={<JoinChatPage />} />
                    <Route path="/chat/:roomId" element={<ChatPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
