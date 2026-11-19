import {describe, expect, it} from "vitest";
import {fold, searchBy} from "./search.ts";

const countries = [
    {name: 'United States', code: 'US', aliases: ['USA', 'America']},
    {name: 'Slovakia', code: 'SK', aliases: []},
    {name: 'Slovenia', code: 'SI', aliases: ['Slovenija']},
    {name: 'Serbia', code: 'RS', aliases: ['Srbija', 'Србија']},
    {name: 'Türkiye', code: 'TR', aliases: ['Turkey']},
    {name: 'Côte d’Ivoire', code: 'CI', aliases: ['Ivory Coast']},
    {name: 'São Tomé & Príncipe', code: 'ST', aliases: []},
];
const country = (q: string) => searchBy(countries, q, c => [c.name, c.code, ...c.aliases]).map(c => c.name);

const stations = ['Radio Koper', 'Radio 1 Rock', 'Val 202', 'Rock Radio Classics SLO', 'Radio Capodistria', 'Naxi ExYu Radio']
    .map(name => ({name}));
const station = (q: string) => searchBy(stations, q, s => [s.name]).map(s => s.name);

describe('search', () => {
    it('folds case, accents and punctuation away', () => {
        expect(fold('  Côte d’Ivoire!! ')).toBe('cote d ivoire');
        expect(fold('São Tomé & Príncipe')).toBe('sao tome principe');
        expect(fold('Србија')).toBe('србија');
    });

    it('finds countries however they are typed', () => {
        expect(country('Slo')).toEqual(['Slovakia', 'Slovenia']);
        expect(country('slo')).toEqual(['Slovakia', 'Slovenia']);
        expect(country('slovnia')).toEqual(['Slovenia']);
        expect(country('srbija')).toEqual(['Serbia']);
        expect(country('Србија')).toEqual(['Serbia']);
        expect(country('usa')).toEqual(['United States']);
        expect(country('turkiye')).toEqual(['Türkiye']);
        expect(country('turkey')).toEqual(['Türkiye']);
        expect(country('cote')).toEqual(['Côte d’Ivoire']);
        expect(country('sao tome')).toEqual(['São Tomé & Príncipe']);
        expect(country('rs')[0]).toBe('Serbia');
    });

    it('finds stations by any of their words, in any order', () => {
        expect(station('koper')).toEqual(['Radio Koper']);
        expect(station('koper radio')).toEqual(['Radio Koper']);
        expect(station('radio1')).toEqual(['Radio 1 Rock']);
        expect(station('val 202')).toEqual(['Val 202']);
        expect(station('capodistra')).toEqual(['Radio Capodistria']);
        expect(station('exyu')).toEqual(['Naxi ExYu Radio']);
    });

    it('puts the closest matches first, and keeps the rest in their order', () => {
        expect(station('rock')).toEqual(['Rock Radio Classics SLO', 'Radio 1 Rock']);
        expect(station('radio')[0]).toBe('Radio Koper');
    });

    it('returns everything for an empty search and nothing for no match', () => {
        expect(station('   ')).toHaveLength(stations.length);
        expect(station('zzzz')).toEqual([]);
    });
});
