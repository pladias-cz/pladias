export interface Feature {
    id: number;
    name: string;
    administrator: string;
    email: string;
    explanation: string;
    bibliography: string;
    datatype: number; // FK → TraitDatatype.id
    inheritance: number;// FK → TraitAggregationType.id
    enumerate?: number;// FK → TraitEnumerate.id
    minimum?: number;
    maximum?: number;
    units?: string;
    section: string;
    /** traitAdmin nebo administrátor této vlastnosti (server: user.supervises(feature)) – oprávnění k importu/mazání řad a nastavení výchozí řady */
    canAdminister?: boolean;
}
