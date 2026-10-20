import {useRef} from 'react';
import {Outlet} from 'react-router-dom';
import {Container, Row} from 'react-bootstrap';
import MainMenu from './core/MainMenu';
import FlashMessages from './core/FlashMessages';
import ErrorBoundary from './components/ErrorBoundary';
import {useInstanceMessages} from './hooks/useInstanceMessages';
import {useNavOffset} from './hooks/useNavOffset';

export default function Layout() {
    const navRef = useRef<HTMLDivElement>(null);
    const navHeight = useNavOffset(navRef) + 5;
    const {messages, unavailable} = useInstanceMessages();

    return (
        <>
            <MainMenu ref={navRef}/>
            <Container fluid style={{paddingTop: navHeight}}>
                <Row><FlashMessages messages={messages} unavailable={unavailable}/></Row>
                {/* Chyby renderu stránek zachytí boundary – menu a globální zprávy zůstávají. */}
                <Row>
                    <ErrorBoundary>
                        <Outlet/>
                    </ErrorBoundary>
                </Row>
            </Container>
        </>
    );
}
