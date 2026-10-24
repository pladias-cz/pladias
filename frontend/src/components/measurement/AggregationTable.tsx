import {Table, Spinner} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {useQuery} from '@tanstack/react-query';
import {getTraitAggregationTypes} from '@/services/traitApi';
import RichTextMessage from '@/components/RichTextMessage';
import {useQueryErrorNotify} from '@/query/useQueryErrorNotify';

export default function AggregationTable() {
    const {t} = useTranslation();

    // typy agregací – bez cache (sekce J), při mountu znovu; chyba jde do toastu
    const {data: types = [], isPending: loading, error} = useQuery({
        queryKey: ['traitAggregationTypes'],
        queryFn: getTraitAggregationTypes,
    });
    useQueryErrorNotify(error, t('common.loadFailed'));

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border"/>
            </div>
        );
    }

    return (
        <Table striped bordered hover responsive>
            <thead>
            <tr>
                <th>{t('trait.aggregationTypes.key')}</th>
                <th>{t('trait.aggregationTypes.description')}</th>
            </tr>
            </thead>
            <tbody>
            {types.map((tpe) => (
                <tr key={tpe.key}>
                    <td>
                        <code>{tpe.key}</code>
                    </td>

                    <td><RichTextMessage html={tpe.description}/></td>
                </tr>
            ))}
            </tbody>
        </Table>
    );
}
