import json


def test_templates_endpoint_exists(client):

    response = client.get(
        "/api/templates"
    )

    assert response.status_code == 200


def test_templates_returns_json(client):

    response = client.get(
        "/api/templates"
    )

    assert response.is_json


def test_templates_has_required_fields(client):

    response = client.get(
        "/api/templates"
    )

    data = response.get_json()

    assert isinstance(data, list)

    if len(data) > 0:

        template = data[0]

        assert "id" in template
        assert "name" in template
        assert "image" in template