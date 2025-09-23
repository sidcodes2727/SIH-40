const client = require('./db_test');

async function testDb() {
    try {
        await client.connect();
        console.log('Connected to the database successfully.');
        const result = await client.query('INSERT INTO measurements (temperature, latitude, longitude, depth, time) VALUES (15.2, 12.3, 77.5, 300, 1632500000) RETURNING id');
        console.log('Inserted record with id:', result.rows[0].id);

    } catch (error) {
        console.error('Error executing query', error);
    } finally {
        await client.end();
    }
}

testDb();
