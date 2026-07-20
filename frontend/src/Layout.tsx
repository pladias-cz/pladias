import {useRef} from 'react';
import {Outlet} from 'react-router-dom';
import {Container, Row} from 'react-bootstrap';
import MainMenu from './core/MainMenu';
import FlashMessages from './core/FlashMessages.jsx';
import {useNavOffset} from './hooks/useNavOffset.jsx';

export default function Layout() {
    const navRef = useRef<HTMLDivElement>(null);
    const navHeight = useNavOffset(navRef) + 5;

    return (
        <>
            <MainMenu ref={navRef}/>
            <Container fluid style={{paddingTop: navHeight}}>
                <Row><FlashMessages/></Row>
                <Row><Outlet/></Row>
            </Container>
        </>
    );
}
