import { useEffect, useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';

type LoadingSpinnerProps = {
    loading: boolean;
    text?: string;
};

function LoadingSpinner({ loading, text }: LoadingSpinnerProps) {
    const [isFading, setIsFading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const fadeTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (loading) {
            if (fadeTimeoutRef.current !== null) {
                clearTimeout(fadeTimeoutRef.current);
            }

            setIsFading(false);
            setShowSpinner(true);
            return;
        }

        if (!showSpinner) {
            return;
        }

        setIsFading(true);

        fadeTimeoutRef.current = window.setTimeout(() => {
            setShowSpinner(false);
            setIsFading(false);
        }, 600);

        return () => {
            if (fadeTimeoutRef.current !== null) {
                clearTimeout(fadeTimeoutRef.current);
            }
        };
    }, [loading, showSpinner]);

    if (!showSpinner) {
        return null;
    }

    return (
        <div className={`search-spinner ${isFading ? 'search-spinner--fade' : ''}`}>
            <Spinner animation="border" role="status">
                <span className="visually-hidden">{text}</span>
            </Spinner>
            <div className="search-spinner__text">{text}</div>
        </div>
    );
}

export default LoadingSpinner;
