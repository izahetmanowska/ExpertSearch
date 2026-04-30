export type Expert = {
    uuid: string;
    name: string;
    email?: string;
    papers?: string[];
    courses?: string[];
    projects?: string[];
    job_title?:string;
    score: number;
};

export type SearchResponse = {
    query: string;
    query_type: string;
    count: number;
    results: Expert[];
};

export type Paper = {
    title: string;
    subtitle: string;
    year: number;
    abstract: string;
    file_url: string;
}

export type Project = {
    title: string;
    period_start_date: string;
    period_end_date: number;
    description: string;
}

export type Course = {
    title: string;
    period: string;
}

export type PersonResponse = {
    person_uuid: string;
    data: PersonData[];
};

export type PersonData = {
    first_name: string;
    last_name: string;
    email: string;
    job_title: string;
};

export type PaperResponse = {
    person_uuid: string;
    papers: Paper[];
};

export type ProjectResponse = {
    person_uuid: string;
    projects: Project[];
};

export type CourseResponse = {
    person_uuid: string;
    courses: Course[];
};