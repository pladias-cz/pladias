import React, {useEffect, useState} from "react";
import {Alert, Col, Row} from "react-bootstrap";

interface Message {
    type: "success" | "danger" | "warning" | "info";
    text: string;
}

// used only for global info (like server maintenance), for immediately flashing useúmodify new component

const FlashMessages: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);

    const fetchMessages = async () => {
        try {
            const res = await fetch("/api/react/infoGlobal");
            if (!res.ok) throw new Error("Failed to fetch messages");
            const data: Message[] = await res.json();
            setMessages(data);
        } catch (err) {
            console.error(err);
            setMessages([]);
        }
    };

    useEffect(() => {
        fetchMessages();

        const interval = setInterval(fetchMessages, 30000); // každých 30s
        return () => clearInterval(interval);
    }, []);

    if (messages.length === 0) return null;

    return (
        <Row className="justify-content-center text-center">
            <Col sm={12} md={{span: 10, offset: 1}}>
                {messages.map((message, idx) => (
                    <Alert key={idx} variant={message.type}>
                        {message.text}
                    </Alert>
                ))}
            </Col>
        </Row>
    );
};

export default FlashMessages;