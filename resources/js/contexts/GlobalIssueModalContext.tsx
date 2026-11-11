import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from 'react';

interface GlobalIssueModalContextProps {
    isOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

const GlobalIssueModalContext = createContext<
    GlobalIssueModalContextProps | undefined
>(undefined);

export function GlobalIssueModalProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input
            const target = e.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            if (!isInput && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                openModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <GlobalIssueModalContext.Provider
            value={{ isOpen, openModal, closeModal }}
        >
            {children}
        </GlobalIssueModalContext.Provider>
    );
}

export function useGlobalIssueModal() {
    const context = useContext(GlobalIssueModalContext);
    if (!context) {
        throw new Error(
            'useGlobalIssueModal must be used within a GlobalIssueModalProvider',
        );
    }
    return context;
}
